/**
 * 核心拦截器 - 处理 before_tool_call 事件
 */

import * as crypto from 'crypto';
import { ToolCall, RiskAssessment, Decision, DecisionSource, AuditLogEntry, ApprovalRequest, InterceptResult, RiskLevel } from '../types';
import { RiskEngine } from './RiskEngine';
import { ProfileMatcher } from './ProfileMatcher';
import { TokenValidator } from './TokenValidator';
import { AuditLog } from '../memory/AuditLog';
import { MemoryStore } from '../memory/MemoryStore';

export class Interceptor {
  private riskEngine: RiskEngine;
  private profileMatcher: ProfileMatcher;
  private tokenValidator: TokenValidator;
  private auditLog: AuditLog;
  private memoryStore: MemoryStore;
  
  // 待审批请求缓存
  private pendingRequests: Map<string, ApprovalRequest> = new Map();
  private validationResults: Map<string, { passed: boolean; error?: string }> = new Map();

  constructor(config?: any, llmConfig?: any) {
    this.riskEngine = new RiskEngine(llmConfig);
    this.profileMatcher = new ProfileMatcher();
    this.tokenValidator = new TokenValidator();
    this.auditLog = new AuditLog();
    this.memoryStore = new MemoryStore();
  }

  /**
   * 生成操作指纹
   */
  generateFingerprint(toolCall: ToolCall): string {
    const normalizedArgs = this.normalizeArgs(toolCall.args);
    const raw = `${toolCall.module}:${toolCall.method}:${normalizedArgs}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * 标准化参数 (用于指纹生成)
   * - 文件路径：具体路径 → 通配符模式
   * - 命令：具体值 → 占位符
   */
  private normalizeArgs(args: any): string {
    // 处理 args 不是数组的情况
    if (!Array.isArray(args)) {
      return JSON.stringify(args || '');
    }
    
    if (args.length === 0) {
      return '';
    }
    
    return args.map((arg: any) => {
      if (typeof arg === 'string') {
        // 文件路径标准化：/tmp/cache → /tmp/*
        if (arg.startsWith('/')) {
          const parts = arg.split('/');
          if (parts.length > 2) {
            return `${parts.slice(0, 2).join('/')}/*`;
          }
        }
        // 命令参数标准化
        if (arg.includes(' ')) {
          const words = arg.split(' ');
          return words.map((w: string) => w.startsWith('/') ? w.split('/').slice(0, 2).join('/') + '/*' : w).join(' ');
        }
      }
      return JSON.stringify(arg);
    }).join('|');
  }

  /**
   * 拦截工具调用 (before_tool_call 钩子)
   * 返回：{ block: true } 阻止执行 | { block: false } 允许执行
   */
  async intercept(toolCall: ToolCall): Promise<InterceptResult> {

      // Step 0: 检查是否有待审批请求的验证结果
    const fingerprint = this.generateFingerprint(toolCall);
    const validationResult = this.checkValidationByFingerprint(fingerprint);
    console.log(`[Interceptor] 指纹：${fingerprint}`);
  
    if (validationResult) {
    // 有待审批验证结果
     console.log('[Interceptor] 检测到待审批验证结果:', validationResult);
    
    if (!validationResult.passed) {
      // 验证失败 → 直接拒绝，不重试
      console.log('[Interceptor] 验证失败，阻止工具执行');
      return { 
        block: true, 
        message: `❌ 令牌验证失败：${validationResult.error}` 
      };
    }
    
    // 验证成功 → 清除状态，允许执行
    console.log('[Interceptor] 验证成功，允许工具执行');
      if (validationResult.requestId) {
        this.clearValidation(validationResult.requestId);
      }
    return { block: false, message: '令牌验证成功，允许工具执行' };
  }
    console.log(`[Interceptor] 拦截工具调用：${toolCall.module}.${toolCall.method}`);
  
    // Step 2: 画像匹配
    const profileMatch = await this.profileMatcher.match(fingerprint);
    if (profileMatch && profileMatch.trustScore >= 0.8) {
      console.log(`[Interceptor] 画像匹配成功，信任分数：${profileMatch.trustScore} → 自动 ALLOW`);
      await this.logDecision(toolCall, 'LOW', 'ALLOW', 'PROFILE', profileMatch.fingerprint, String(profileMatch.trustScore));
      return { block: false, message: '画像匹配成功，信任分数：' + profileMatch.trustScore + ' → 自动 ALLOW' };
    }

    // Step 3: LLM 风险评估
    const riskAssessment = await this.riskEngine.assess(toolCall);
    console.log(`[Interceptor] 风险评估：${riskAssessment.riskLevel} (置信度：${riskAssessment.confidence})`);

    // 根据风险等级决策
    if (riskAssessment.riskLevel === 'LOW') {
      console.log('[Interceptor] 低风险 → 自动 ALLOW');
      await this.logDecision(toolCall, riskAssessment.riskLevel, 'ALLOW', 'LLM', undefined, undefined, riskAssessment.analysis);
      return { block: false, message: 'LL风险 → 自动 ALLOW' };
    }

    if (riskAssessment.riskLevel === 'HIGH' && riskAssessment.recommendation === 'DENY') {
      console.log('[Interceptor] 高风险且建议拒绝 → 自动 DENY');
      await this.logDecision(toolCall, riskAssessment.riskLevel, 'DENY', 'LLM', undefined, undefined, riskAssessment.analysis);
      const requestId = await this.createApprovalRequest(toolCall, riskAssessment);
      return { block: true, message: `LLM 评估拒绝：${riskAssessment.analysis}, 风险等级：${riskAssessment.riskLevel}, 需要验证您的口令后操作` };
    }

    // Step 4: 需要人类审批
    console.log('[Interceptor] 需要用户审批');
    const requestId = await this.createApprovalRequest(toolCall, riskAssessment);
    
    // 直接返回拦截结果，让 OpenClaw 处理审批PENDING_APPROVAL
    return { block: true, message: '需要用户审批, 任务暂时挂起', requestId, reason: 'PENDING_APPROVAL' };
  }

  private checkValidationByFingerprint(fingerprint: string): { passed: boolean; error?: string; requestId?: string } | null {
  for (const [requestId, validation] of this.validationResults.entries()) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      const requestFingerprint = this.generateFingerprint(request.toolCall);
      if (requestFingerprint === fingerprint) {
        return {
          ...validation,
          requestId,
        };
      }
    }
  }
  return null;
}

  /**
   * 创建审批请求
   */
  private async createApprovalRequest(toolCall: ToolCall, riskAssessment: RiskAssessment): Promise<string> {
    const id = crypto.randomUUID();
    const request: ApprovalRequest = {
      id,
      toolCall,
      riskAssessment,
      status: 'PENDING',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 分钟过期
    };
    this.pendingRequests.set(id, request);
    return id;
  }




  

  /**
   * 发送审批请求给用户
   */
  /**
   * 处理用户响应 (clawbands_respond 工具)
   */
  async respond(requestId: string, userInput: string): Promise<{ approved: boolean; reason?: string }> {
    console.log(`[Interceptor] 处理用户响应：${requestId}`);

    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return { approved: false, reason: '请求不存在或已过期' };
    }

    // 检查过期
    if (Date.now() > request.expiresAt) {
      this.pendingRequests.delete(requestId);
      return { approved: false, reason: '请求已过期' };
    }

    // Step 5: 解析用户输入 (令牌 + 决策)
    const parts = userInput.trim().split(/\s+/);
    if (parts.length < 2) {
      return { approved: false, reason: '格式错误，请使用：[令牌] [YES/NO]' };
    }

    const token = parts[0];
    const decision = parts[1].toUpperCase();

    if (!['YES', 'NO'].includes(decision)) {
      return { approved: false, reason: '决策必须是 YES 或 NO' };
    }

    // Step 6: 令牌验证
    const tokenValid = await this.tokenValidator.verify(token);
    if (!tokenValid.valid) {
      console.log('[Interceptor] 令牌验证失败');

       this.validationResults.set(requestId, {
        passed: false,
        error: '[Interceptor] 令牌验证失败',
      });

      await this.logDecision(request.toolCall, request.riskAssessment.riskLevel, 'DENY', 'HUMAN', undefined, undefined, '令牌验证失败');
      return { approved: false, reason: '令牌错误' };
    }

    console.log(`[Interceptor] 令牌验证通过，用户：${tokenValid.userId}`);

    // 处理决策
    if (decision === 'NO') {
      console.log('[Interceptor] 用户拒绝');
      this.pendingRequests.delete(requestId);
      await this.logDecision(request.toolCall, request.riskAssessment.riskLevel, 'DENY', 'HUMAN', tokenValid.userId, undefined, '用户拒绝');
      return { approved: false, reason: '用户拒绝' };
    }


   

    // 用户批准
    console.log('[Interceptor] 用户批准');
    this.pendingRequests.delete(requestId);

    // 记录验证结果
    this.validationResults.set(requestId, {
      passed: true,
      error: undefined,
    });
    
    // 记录决策
    await this.logDecision(
      request.toolCall, 
      request.riskAssessment.riskLevel, 
      'APPROVED', 
      'HUMAN', 
      tokenValid.userId, 
      undefined, 
      '用户批准'
    );

    // 学习：更新画像
    const fingerprint = this.generateFingerprint(request.toolCall);
    await this.profileMatcher.learn(fingerprint, tokenValid.userId || 'unknown', 'APPROVED');

    return { approved: true };
  }

  /**
   * 记录审计日志
   */
  private async logDecision(
    toolCall: ToolCall,
    riskLevel: RiskLevel,
    decision: string,
    source: DecisionSource,
    userId?: string,
    matchedProfile?: string,
    analysis?: string,
    trustScore?: number
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      module: toolCall.module,
      method: toolCall.method,
      args: toolCall.args,
      riskLevel,
      decision,
      source,
      userId,
      tokenUsed: userId !== undefined,
      matchedProfile,
      trustScore,
      analysis,
    };
    await this.auditLog.append(entry);
  }

  private clearValidation(requestId: string): void {
    this.validationResults.delete(requestId);
    console.log('[Interceptor] 验证结果已清除:', requestId);
  }

  /**
   * 获取待审批请求列表
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values());
  }
}
