"use strict";
/**
 * 核心拦截器 - 处理 before_tool_call 事件
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interceptor = void 0;
const crypto = __importStar(require("crypto"));
const RiskEngine_1 = require("./RiskEngine");
const ProfileMatcher_1 = require("./ProfileMatcher");
const TokenValidator_1 = require("./TokenValidator");
const AuditLog_1 = require("../memory/AuditLog");
const MemoryStore_1 = require("../memory/MemoryStore");
class Interceptor {
    riskEngine;
    profileMatcher;
    tokenValidator;
    auditLog;
    memoryStore;
    // 待审批请求缓存
    pendingRequests = new Map();
    validationResults = new Map();
    constructor(config, llmConfig) {
        this.riskEngine = new RiskEngine_1.RiskEngine(llmConfig);
        this.profileMatcher = new ProfileMatcher_1.ProfileMatcher();
        this.tokenValidator = new TokenValidator_1.TokenValidator();
        this.auditLog = new AuditLog_1.AuditLog();
        this.memoryStore = new MemoryStore_1.MemoryStore();
    }
    /**
     * 生成操作指纹
     */
    generateFingerprint(toolCall) {
        const normalizedArgs = this.normalizeArgs(toolCall.args);
        const raw = `${toolCall.module}:${toolCall.method}:${normalizedArgs}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
    /**
     * 标准化参数 (用于指纹生成)
     * - 文件路径：具体路径 → 通配符模式
     * - 命令：具体值 → 占位符
     */
    normalizeArgs(args) {
        // 处理 args 不是数组的情况
        if (!Array.isArray(args)) {
            return JSON.stringify(args || '');
        }
        if (args.length === 0) {
            return '';
        }
        return args.map((arg) => {
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
                    return words.map((w) => w.startsWith('/') ? w.split('/').slice(0, 2).join('/') + '/*' : w).join(' ');
                }
            }
            return JSON.stringify(arg);
        }).join('|');
    }
    /**
     * 拦截工具调用 (before_tool_call 钩子)
     * 返回：{ block: true } 阻止执行 | { block: false } 允许执行
     */
    async intercept(toolCall) {
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
    checkValidationByFingerprint(fingerprint) {
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
    async createApprovalRequest(toolCall, riskAssessment) {
        const id = crypto.randomUUID();
        const request = {
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
    async respond(requestId, userInput) {
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
        await this.logDecision(request.toolCall, request.riskAssessment.riskLevel, 'APPROVED', 'HUMAN', tokenValid.userId, undefined, '用户批准');
        // 学习：更新画像
        const fingerprint = this.generateFingerprint(request.toolCall);
        await this.profileMatcher.learn(fingerprint, tokenValid.userId || 'unknown', 'APPROVED');
        return { approved: true };
    }
    /**
     * 记录审计日志
     */
    async logDecision(toolCall, riskLevel, decision, source, userId, matchedProfile, analysis, trustScore) {
        const entry = {
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
    clearValidation(requestId) {
        this.validationResults.delete(requestId);
        console.log('[Interceptor] 验证结果已清除:', requestId);
    }
    /**
     * 获取待审批请求列表
     */
    getPendingRequests() {
        return Array.from(this.pendingRequests.values());
    }
}
exports.Interceptor = Interceptor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJjZXB0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29yZS9JbnRlcmNlcHRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWlDO0FBRWpDLDZDQUEwQztBQUMxQyxxREFBa0Q7QUFDbEQscURBQWtEO0FBQ2xELGlEQUE4QztBQUM5Qyx1REFBb0Q7QUFFcEQsTUFBYSxXQUFXO0lBQ2QsVUFBVSxDQUFhO0lBQ3ZCLGNBQWMsQ0FBaUI7SUFDL0IsY0FBYyxDQUFpQjtJQUMvQixRQUFRLENBQVc7SUFDbkIsV0FBVyxDQUFjO0lBRWpDLFVBQVU7SUFDRixlQUFlLEdBQWlDLElBQUksR0FBRyxFQUFFLENBQUM7SUFDMUQsaUJBQWlCLEdBQXFELElBQUksR0FBRyxFQUFFLENBQUM7SUFFeEYsWUFBWSxNQUFZLEVBQUUsU0FBZTtRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksdUJBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksK0JBQWMsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSwrQkFBYyxFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLG1CQUFRLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUkseUJBQVcsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRDs7T0FFRztJQUNILG1CQUFtQixDQUFDLFFBQWtCO1FBQ3BDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sR0FBRyxHQUFHLEdBQUcsUUFBUSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3RFLE9BQU8sTUFBTSxDQUFD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QUUsTUFBTSxLQUFLLFNBQVM7WUFDL0IsY0FBYztZQUNkLFVBQVU7WUFDVixRQUFRO1NBQ1QsQ0FBQztRQUNGLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVPLGVBQWUsQ0FBQyxTQUFpQjtRQUN2QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCO1FBQ2hCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBeFNELGtDQXdTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5qC45b+D5oum5oiq5ZmoIC0g5aSE55CGIGJlZm9yZV90b29sX2NhbGwg5LqL5Lu2XG4gKi9cblxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgeyBUb29sQ2FsbCwgUmlza0Fzc2Vzc21lbnQsIERlY2lzaW9uLCBEZWNpc2lvblNvdXJjZSwgQXVkaXRMb2dFbnRyeSwgQXBwcm92YWxSZXF1ZXN0LCBJbnRlcmNlcHRSZXN1bHQsIFJpc2tMZXZlbCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFJpc2tFbmdpbmUgfSBmcm9tICcuL1Jpc2tFbmdpbmUnO1xuaW1wb3J0IHsgUHJvZmlsZU1hdGNoZXIgfSBmcm9tICcuL1Byb2ZpbGVNYXRjaGVyJztcbmltcG9ydCB7IFRva2VuVmFsaWRhdG9yIH0gZnJvbSAnLi9Ub2tlblZhbGlkYXRvcic7XG5pbXBvcnQgeyBBdWRpdExvZyB9IGZyb20gJy4uL21lbW9yeS9BdWRpdExvZyc7XG5pbXBvcnQgeyBNZW1vcnlTdG9yZSB9IGZyb20gJy4uL21lbW9yeS9NZW1vcnlTdG9yZSc7XG5cbmV4cG9ydCBjbGFzcyBJbnRlcmNlcHRvciB7XG4gIHByaXZhdGUgcmlza0VuZ2luZTogUmlza0VuZ2luZTtcbiAgcHJpdmF0ZSBwcm9maWxlTWF0Y2hlcjogUHJvZmlsZU1hdGNoZXI7XG4gIHByaXZhdGUgdG9rZW5WYWxpZGF0b3I6IFRva2VuVmFsaWRhdG9yO1xuICBwcml2YXRlIGF1ZGl0TG9nOiBBdWRpdExvZztcbiAgcHJpdmF0ZSBtZW1vcnlTdG9yZTogTWVtb3J5U3RvcmU7XG4gIFxuICAvLyDlvoXlrqHmibnor7fmsYLnvJPlrZhcbiAgcHJpdmF0ZSBwZW5kaW5nUmVxdWVzdHM6IE1hcDxzdHJpbmcsIEFwcHJvdmFsUmVxdWVzdD4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgdmFsaWRhdGlvblJlc3VsdHM6IE1hcDxzdHJpbmcsIHsgcGFzc2VkOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9PiA9IG5ldyBNYXAoKTtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc/OiBhbnksIGxsbUNvbmZpZz86IGFueSkge1xuICAgIHRoaXMucmlza0VuZ2luZSA9IG5ldyBSaXNrRW5naW5lKGxsbUNvbmZpZyk7XG4gICAgdGhpcy5wcm9maWxlTWF0Y2hlciA9IG5ldyBQcm9maWxlTWF0Y2hlcigpO1xuICAgIHRoaXMudG9rZW5WYWxpZGF0b3IgPSBuZXcgVG9rZW5WYWxpZGF0b3IoKTtcbiAgICB0aGlzLmF1ZGl0TG9nID0gbmV3IEF1ZGl0TG9nKCk7XG4gICAgdGhpcy5tZW1vcnlTdG9yZSA9IG5ldyBNZW1vcnlTdG9yZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOaTjeS9nOaMh+e6uVxuICAgKi9cbiAgZ2VuZXJhdGVGaW5nZXJwcmludCh0b29sQ2FsbDogVG9vbENhbGwpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRBcmdzID0gdGhpcy5ub3JtYWxpemVBcmdzKHRvb2xDYWxsLmFyZ3MpO1xuICAgIGNvbnN0IHJhdyA9IGAke3Rvb2xDYWxsLm1vZHVsZX06JHt0b29sQ2FsbC5tZXRob2R9OiR7bm9ybWFsaXplZEFyZ3N9YDtcbiAgICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShyYXcpLmRpZ2VzdCgnaGV4Jyk7XG4gIH1cblxuICAvKipcbiAgICog5qCH5YeG5YyW5Y+C5pWwICjnlKjkuo7mjIfnurnnlJ/miJApXG4gICAqIC0g5paH5Lu26Lev5b6E77ya5YW35L2T6Lev5b6EIOKGkiDpgJrphY3nrKbmqKHlvI9cbiAgICogLSDlkb3ku6TvvJrlhbfkvZPlgLwg4oaSIOWNoOS9jeesplxuICAgKi9cbiAgcHJpdmF0ZSBub3JtYWxpemVBcmdzKGFyZ3M6IGFueSk6IHN0cmluZyB7XG4gICAgLy8g5aSE55CGIGFyZ3Mg5LiN5piv5pWw57uE55qE5oOF5Ya1XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFyZ3MpKSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJncyB8fCAnJyk7XG4gICAgfVxuICAgIFxuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gYXJncy5tYXAoKGFyZzogYW55KSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8g5paH5Lu26Lev5b6E5qCH5YeG5YyW77yaL3RtcC9jYWNoZSDihpIgL3RtcC8qXG4gICAgICAgIGlmIChhcmcuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgICAgY29uc3QgcGFydHMgPSBhcmcuc3BsaXQoJy8nKTtcbiAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgcmV0dXJuIGAke3BhcnRzLnNsaWNlKDAsIDIpLmpvaW4oJy8nKX0vKmA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIOWRveS7pOWPguaVsOagh+WHhuWMllxuICAgICAgICBpZiAoYXJnLmluY2x1ZGVzKCcgJykpIHtcbiAgICAgICAgICBjb25zdCB3b3JkcyA9IGFyZy5zcGxpdCgnICcpO1xuICAgICAgICAgIHJldHVybiB3b3Jkcy5tYXAoKHc6IHN0cmluZykgPT4gdy5zdGFydHNXaXRoKCcvJykgPyB3LnNwbGl0KCcvJykuc2xpY2UoMCwgMikuam9pbignLycpICsgJy8qJyA6IHcpLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZyk7XG4gICAgfSkuam9pbignfCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIOaLpuaIquW3peWFt+iwg+eUqCAoYmVmb3JlX3Rvb2xfY2FsbCDpkqnlrZApXG4gICAqIOi/lOWbnu+8mnsgYmxvY2s6IHRydWUgfSDpmLvmraLmiafooYwgfCB7IGJsb2NrOiBmYWxzZSB9IOWFgeiuuOaJp+ihjFxuICAgKi9cbiAgYXN5bmMgaW50ZXJjZXB0KHRvb2xDYWxsOiBUb29sQ2FsbCk6IFByb21pc2U8SW50ZXJjZXB0UmVzdWx0PiB7XG5cbiAgICAgIC8vIFN0ZXAgMDog5qOA5p+l5piv5ZCm5pyJ5b6F5a6h5om56K+35rGC55qE6aqM6K+B57uT5p6cXG4gICAgY29uc3QgZmluZ2VycHJpbnQgPSB0aGlzLmdlbmVyYXRlRmluZ2VycHJpbnQodG9vbENhbGwpO1xuICAgIGNvbnN0IHZhbGlkYXRpb25SZXN1bHQgPSB0aGlzLmNoZWNrVmFsaWRhdGlvbkJ5RmluZ2VycHJpbnQoZmluZ2VycHJpbnQpO1xuICAgIGNvbnNvbGUubG9nKGBbSW50ZXJjZXB0b3JdIOaMh+e6ue+8miR7ZmluZ2VycHJpbnR9YCk7XG4gIFxuICAgIGlmICh2YWxpZGF0aW9uUmVzdWx0KSB7XG4gICAgLy8g5pyJ5b6F5a6h5om56aqM6K+B57uT5p6cXG4gICAgIGNvbnNvbGUubG9nKCdbSW50ZXJjZXB0b3JdIOajgOa1i+WIsOW+heWuoeaJuemqjOivgee7k+aenDonLCB2YWxpZGF0aW9uUmVzdWx0KTtcbiAgICBcbiAgICBpZiAoIXZhbGlkYXRpb25SZXN1bHQucGFzc2VkKSB7XG4gICAgICAvLyDpqozor4HlpLHotKUg4oaSIOebtOaOpeaLkue7ne+8jOS4jemHjeivlVxuICAgICAgY29uc29sZS5sb2coJ1tJbnRlcmNlcHRvcl0g6aqM6K+B5aSx6LSl77yM6Zi75q2i5bel5YW35omn6KGMJyk7XG4gICAgICByZXR1cm4geyBcbiAgICAgICAgYmxvY2s6IHRydWUsIFxuICAgICAgICBtZXNzYWdlOiBg4p2MIOS7pOeJjOmqjOivgeWksei0pe+8miR7dmFsaWRhdGlvblJlc3VsdC5lcnJvcn1gIFxuICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLy8g6aqM6K+B5oiQ5YqfIOKGkiDmuIXpmaTnirbmgIHvvIzlhYHorrjmiafooYxcbiAgICBjb25zb2xlLmxvZygnW0ludGVyY2VwdG9yXSDpqozor4HmiJDlip/vvIzlhYHorrjlt6XlhbfmiafooYwnKTtcbiAgICAgIGlmICh2YWxpZGF0aW9uUmVzdWx0LnJlcXVlc3RJZCkge1xuICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbih2YWxpZGF0aW9uUmVzdWx0LnJlcXVlc3RJZCk7XG4gICAgICB9XG4gICAgcmV0dXJuIHsgYmxvY2s6IGZhbHNlLCBtZXNzYWdlOiAn5Luk54mM6aqM6K+B5oiQ5Yqf77yM5YWB6K645bel5YW35omn6KGMJyB9O1xuICB9XG4gICAgY29uc29sZS5sb2coYFtJbnRlcmNlcHRvcl0g5oum5oiq5bel5YW36LCD55So77yaJHt0b29sQ2FsbC5tb2R1bGV9LiR7dG9vbENhbGwubWV0aG9kfWApO1xuICBcbiAgICAvLyBTdGVwIDI6IOeUu+WDj+WMuemFjVxuICAgIGNvbnN0IHByb2ZpbGVNYXRjaCA9IGF3YWl0IHRoaXMucHJvZmlsZU1hdGNoZXIubWF0Y2goZmluZ2VycHJpbnQpO1xuICAgIGlmIChwcm9maWxlTWF0Y2ggJiYgcHJvZmlsZU1hdGNoLnRydXN0U2NvcmUgPj0gMC44KSB7XG4gICAgICBjb25zb2xlLmxvZyhgW0ludGVyY2VwdG9yXSDnlLvlg4/ljLnphY3miJDlip/vvIzkv6Hku7vliIbmlbDvvJoke3Byb2ZpbGVNYXRjaC50cnVzdFNjb3JlfSDihpIg6Ieq5YqoIEFMTE9XYCk7XG4gICAgICBhd2FpdCB0aGlzLmxvZ0RlY2lzaW9uKHRvb2xDYWxsLCAnTE9XJywgJ0FMTE9XJywgJ1BST0ZJTEUnLCBwcm9maWxlTWF0Y2guZmluZ2VycHJpbnQsIFN0cmluZyhwcm9maWxlTWF0Y2gudHJ1c3RTY29yZSkpO1xuICAgICAgcmV0dXJuIHsgYmxvY2s6IGZhbHNlLCBtZXNzYWdlOiAn55S75YOP5Yy56YWN5oiQ5Yqf77yM5L+h5Lu75YiG5pWw77yaJyArIHByb2ZpbGVNYXRjaC50cnVzdFNjb3JlICsgJyDihpIg6Ieq5YqoIEFMTE9XJyB9O1xuICAgIH1cblxuICAgIC8vIFN0ZXAgMzogTExNIOmjjumZqeivhOS8sFxuICAgIGNvbnN0IHJpc2tBc3Nlc3NtZW50ID0gYXdhaXQgdGhpcy5yaXNrRW5naW5lLmFzc2Vzcyh0b29sQ2FsbCk7XG4gICAgY29uc29sZS5sb2coYFtJbnRlcmNlcHRvcl0g6aOO6Zmp6K+E5Lyw77yaJHtyaXNrQXNzZXNzbWVudC5yaXNrTGV2ZWx9ICjnva7kv6HluqbvvJoke3Jpc2tBc3Nlc3NtZW50LmNvbmZpZGVuY2V9KWApO1xuXG4gICAgLy8g5qC55o2u6aOO6Zmp562J57qn5Yaz562WXG4gICAgaWYgKHJpc2tBc3Nlc3NtZW50LnJpc2tMZXZlbCA9PT0gJ0xPVycpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbSW50ZXJjZXB0b3JdIOS9jumjjumZqSDihpIg6Ieq5YqoIEFMTE9XJyk7XG4gICAgICBhd2FpdCB0aGlzLmxvZ0RlY2lzaW9uKHRvb2xDYWxsLCByaXNrQXNzZXNzbWVudC5yaXNrTGV2ZWwsICdBTExPVycsICdMTE0nLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcmlza0Fzc2Vzc21lbnQuYW5hbHlzaXMpO1xuICAgICAgcmV0dXJuIHsgYmxvY2s6IGZhbHNlLCBtZXNzYWdlOiAnTEzpo47pmakg4oaSIOiHquWKqCBBTExPVycgfTtcbiAgICB9XG5cbiAgICBpZiAocmlza0Fzc2Vzc21lbnQucmlza0xldmVsID09PSAnSElHSCcgJiYgcmlza0Fzc2Vzc21lbnQucmVjb21tZW5kYXRpb24gPT09ICdERU5ZJykge1xuICAgICAgY29uc29sZS5sb2coJ1tJbnRlcmNlcHRvcl0g6auY6aOO6Zmp5LiU5bu66K6u5ouS57udIOKGkiDoh6rliqggREVOWScpO1xuICAgICAgYXdhaXQgdGhpcy5sb2dEZWNpc2lvbih0b29sQ2FsbCwgcmlza0Fzc2Vzc21lbnQucmlza0xldmVsLCAnREVOWScsICdMTE0nLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcmlza0Fzc2Vzc21lbnQuYW5hbHlzaXMpO1xuICAgICAgY29uc3QgcmVxdWVzdElkID0gYXdhaXQgdGhpcy5jcmVhdGVBcHByb3ZhbFJlcXVlc3QodG9vbENhbGwsIHJpc2tBc3Nlc3NtZW50KTtcbiAgICAgIHJldHVybiB7IGJsb2NrOiB0cnVlLCBtZXNzYWdlOiBgTExNIOivhOS8sOaLkue7ne+8miR7cmlza0Fzc2Vzc21lbnQuYW5hbHlzaXN9LCDpo47pmannrYnnuqfvvJoke3Jpc2tBc3Nlc3NtZW50LnJpc2tMZXZlbH0sIOmcgOimgemqjOivgeaCqOeahOWPo+S7pOWQjuaTjeS9nGAgfTtcbiAgICB9XG5cbiAgICAvLyBTdGVwIDQ6IOmcgOimgeS6uuexu+WuoeaJuVxuICAgIGNvbnNvbGUubG9nKCdbSW50ZXJjZXB0b3JdIOmcgOimgeeUqOaIt+WuoeaJuScpO1xuICAgIGNvbnN0IHJlcXVlc3RJZCA9IGF3YWl0IHRoaXMuY3JlYXRlQXBwcm92YWxSZXF1ZXN0KHRvb2xDYWxsLCByaXNrQXNzZXNzbWVudCk7XG4gICAgXG4gICAgLy8g55u05o6l6L+U5Zue5oum5oiq57uT5p6c77yM6K6pIE9wZW5DbGF3IOWkhOeQhuWuoeaJuVBFTkRJTkdfQVBQUk9WQUxcbiAgICByZXR1cm4geyBibG9jazogdHJ1ZSwgbWVzc2FnZTogJ+mcgOimgeeUqOaIt+WuoeaJuSwg5Lu75Yqh5pqC5pe25oyC6LW3JywgcmVxdWVzdElkLCByZWFzb246ICdQRU5ESU5HX0FQUFJPVkFMJyB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja1ZhbGlkYXRpb25CeUZpbmdlcnByaW50KGZpbmdlcnByaW50OiBzdHJpbmcpOiB7IHBhc3NlZDogYm9vbGVhbjsgZXJyb3I/OiBzdHJpbmc7IHJlcXVlc3RJZD86IHN0cmluZyB9IHwgbnVsbCB7XG4gIGZvciAoY29uc3QgW3JlcXVlc3RJZCwgdmFsaWRhdGlvbl0gb2YgdGhpcy52YWxpZGF0aW9uUmVzdWx0cy5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5wZW5kaW5nUmVxdWVzdHMuZ2V0KHJlcXVlc3RJZCk7XG4gICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3RGaW5nZXJwcmludCA9IHRoaXMuZ2VuZXJhdGVGaW5nZXJwcmludChyZXF1ZXN0LnRvb2xDYWxsKTtcbiAgICAgIGlmIChyZXF1ZXN0RmluZ2VycHJpbnQgPT09IGZpbmdlcnByaW50KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4udmFsaWRhdGlvbixcbiAgICAgICAgICByZXF1ZXN0SWQsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4gIC8qKlxuICAgKiDliJvlu7rlrqHmibnor7fmsYJcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXBwcm92YWxSZXF1ZXN0KHRvb2xDYWxsOiBUb29sQ2FsbCwgcmlza0Fzc2Vzc21lbnQ6IFJpc2tBc3Nlc3NtZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBpZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgY29uc3QgcmVxdWVzdDogQXBwcm92YWxSZXF1ZXN0ID0ge1xuICAgICAgaWQsXG4gICAgICB0b29sQ2FsbCxcbiAgICAgIHJpc2tBc3Nlc3NtZW50LFxuICAgICAgc3RhdHVzOiAnUEVORElORycsXG4gICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICBleHBpcmVzQXQ6IERhdGUubm93KCkgKyA1ICogNjAgKiAxMDAwLCAvLyA1IOWIhumSn+i/h+acn1xuICAgIH07XG4gICAgdGhpcy5wZW5kaW5nUmVxdWVzdHMuc2V0KGlkLCByZXF1ZXN0KTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuXG5cblxuICBcblxuICAvKipcbiAgICog5Y+R6YCB5a6h5om56K+35rGC57uZ55So5oi3XG4gICAqL1xuICAvKipcbiAgICog5aSE55CG55So5oi35ZON5bqUIChjbGF3YmFuZHNfcmVzcG9uZCDlt6XlhbcpXG4gICAqL1xuICBhc3luYyByZXNwb25kKHJlcXVlc3RJZDogc3RyaW5nLCB1c2VySW5wdXQ6IHN0cmluZyk6IFByb21pc2U8eyBhcHByb3ZlZDogYm9vbGVhbjsgcmVhc29uPzogc3RyaW5nIH0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0ludGVyY2VwdG9yXSDlpITnkIbnlKjmiLflk43lupTvvJoke3JlcXVlc3RJZH1gKTtcblxuICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLnBlbmRpbmdSZXF1ZXN0cy5nZXQocmVxdWVzdElkKTtcbiAgICBpZiAoIXJlcXVlc3QpIHtcbiAgICAgIHJldHVybiB7IGFwcHJvdmVkOiBmYWxzZSwgcmVhc29uOiAn6K+35rGC5LiN5a2Y5Zyo5oiW5bey6L+H5pyfJyB9O1xuICAgIH1cblxuICAgIC8vIOajgOafpei/h+acn1xuICAgIGlmIChEYXRlLm5vdygpID4gcmVxdWVzdC5leHBpcmVzQXQpIHtcbiAgICAgIHRoaXMucGVuZGluZ1JlcXVlc3RzLmRlbGV0ZShyZXF1ZXN0SWQpO1xuICAgICAgcmV0dXJuIHsgYXBwcm92ZWQ6IGZhbHNlLCByZWFzb246ICfor7fmsYLlt7Lov4fmnJ8nIH07XG4gICAgfVxuXG4gICAgLy8gU3RlcCA1OiDop6PmnpDnlKjmiLfovpPlhaUgKOS7pOeJjCArIOWGs+etlilcbiAgICBjb25zdCBwYXJ0cyA9IHVzZXJJbnB1dC50cmltKCkuc3BsaXQoL1xccysvKTtcbiAgICBpZiAocGFydHMubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHsgYXBwcm92ZWQ6IGZhbHNlLCByZWFzb246ICfmoLzlvI/plJnor6/vvIzor7fkvb/nlKjvvJpb5Luk54mMXSBbWUVTL05PXScgfTtcbiAgICB9XG5cbiAgICBjb25zdCB0b2tlbiA9IHBhcnRzWzBdO1xuICAgIGNvbnN0IGRlY2lzaW9uID0gcGFydHNbMV0udG9VcHBlckNhc2UoKTtcblxuICAgIGlmICghWydZRVMnLCAnTk8nXS5pbmNsdWRlcyhkZWNpc2lvbikpIHtcbiAgICAgIHJldHVybiB7IGFwcHJvdmVkOiBmYWxzZSwgcmVhc29uOiAn5Yaz562W5b+F6aG75pivIFlFUyDmiJYgTk8nIH07XG4gICAgfVxuXG4gICAgLy8gU3RlcCA2OiDku6TniYzpqozor4FcbiAgICBjb25zdCB0b2tlblZhbGlkID0gYXdhaXQgdGhpcy50b2tlblZhbGlkYXRvci52ZXJpZnkodG9rZW4pO1xuICAgIGlmICghdG9rZW5WYWxpZC52YWxpZCkge1xuICAgICAgY29uc29sZS5sb2coJ1tJbnRlcmNlcHRvcl0g5Luk54mM6aqM6K+B5aSx6LSlJyk7XG5cbiAgICAgICB0aGlzLnZhbGlkYXRpb25SZXN1bHRzLnNldChyZXF1ZXN0SWQsIHtcbiAgICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdbSW50ZXJjZXB0b3JdIOS7pOeJjOmqjOivgeWksei0pScsXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgdGhpcy5sb2dEZWNpc2lvbihyZXF1ZXN0LnRvb2xDYWxsLCByZXF1ZXN0LnJpc2tBc3Nlc3NtZW50LnJpc2tMZXZlbCwgJ0RFTlknLCAnSFVNQU4nLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgJ+S7pOeJjOmqjOivgeWksei0pScpO1xuICAgICAgcmV0dXJuIHsgYXBwcm92ZWQ6IGZhbHNlLCByZWFzb246ICfku6TniYzplJnor68nIH07XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFtJbnRlcmNlcHRvcl0g5Luk54mM6aqM6K+B6YCa6L+H77yM55So5oi377yaJHt0b2tlblZhbGlkLnVzZXJJZH1gKTtcblxuICAgIC8vIOWkhOeQhuWGs+etllxuICAgIGlmIChkZWNpc2lvbiA9PT0gJ05PJykge1xuICAgICAgY29uc29sZS5sb2coJ1tJbnRlcmNlcHRvcl0g55So5oi35ouS57udJyk7XG4gICAgICB0aGlzLnBlbmRpbmdSZXF1ZXN0cy5kZWxldGUocmVxdWVzdElkKTtcbiAgICAgIGF3YWl0IHRoaXMubG9nRGVjaXNpb24ocmVxdWVzdC50b29sQ2FsbCwgcmVxdWVzdC5yaXNrQXNzZXNzbWVudC5yaXNrTGV2ZWwsICdERU5ZJywgJ0hVTUFOJywgdG9rZW5WYWxpZC51c2VySWQsIHVuZGVmaW5lZCwgJ+eUqOaIt+aLkue7nScpO1xuICAgICAgcmV0dXJuIHsgYXBwcm92ZWQ6IGZhbHNlLCByZWFzb246ICfnlKjmiLfmi5Lnu50nIH07XG4gICAgfVxuXG5cbiAgIFxuXG4gICAgLy8g55So5oi35om55YeGXG4gICAgY29uc29sZS5sb2coJ1tJbnRlcmNlcHRvcl0g55So5oi35om55YeGJyk7XG4gICAgdGhpcy5wZW5kaW5nUmVxdWVzdHMuZGVsZXRlKHJlcXVlc3RJZCk7XG5cbiAgICAvLyDorrDlvZXpqozor4Hnu5PmnpxcbiAgICB0aGlzLnZhbGlkYXRpb25SZXN1bHRzLnNldChyZXF1ZXN0SWQsIHtcbiAgICAgIHBhc3NlZDogdHJ1ZSxcbiAgICAgIGVycm9yOiB1bmRlZmluZWQsXG4gICAgfSk7XG4gICAgXG4gICAgLy8g6K6w5b2V5Yaz562WXG4gICAgYXdhaXQgdGhpcy5sb2dEZWNpc2lvbihcbiAgICAgIHJlcXVlc3QudG9vbENhbGwsIFxuICAgICAgcmVxdWVzdC5yaXNrQXNzZXNzbWVudC5yaXNrTGV2ZWwsIFxuICAgICAgJ0FQUFJPVkVEJywgXG4gICAgICAnSFVNQU4nLCBcbiAgICAgIHRva2VuVmFsaWQudXNlcklkLCBcbiAgICAgIHVuZGVmaW5lZCwgXG4gICAgICAn55So5oi35om55YeGJ1xuICAgICk7XG5cbiAgICAvLyDlrabkuaDvvJrmm7TmlrDnlLvlg49cbiAgICBjb25zdCBmaW5nZXJwcmludCA9IHRoaXMuZ2VuZXJhdGVGaW5nZXJwcmludChyZXF1ZXN0LnRvb2xDYWxsKTtcbiAgICBhd2FpdCB0aGlzLnByb2ZpbGVNYXRjaGVyLmxlYXJuKGZpbmdlcnByaW50LCB0b2tlblZhbGlkLnVzZXJJZCB8fCAndW5rbm93bicsICdBUFBST1ZFRCcpO1xuXG4gICAgcmV0dXJuIHsgYXBwcm92ZWQ6IHRydWUgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDorrDlvZXlrqHorqHml6Xlv5dcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgbG9nRGVjaXNpb24oXG4gICAgdG9vbENhbGw6IFRvb2xDYWxsLFxuICAgIHJpc2tMZXZlbDogUmlza0xldmVsLFxuICAgIGRlY2lzaW9uOiBzdHJpbmcsXG4gICAgc291cmNlOiBEZWNpc2lvblNvdXJjZSxcbiAgICB1c2VySWQ/OiBzdHJpbmcsXG4gICAgbWF0Y2hlZFByb2ZpbGU/OiBzdHJpbmcsXG4gICAgYW5hbHlzaXM/OiBzdHJpbmcsXG4gICAgdHJ1c3RTY29yZT86IG51bWJlclxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBlbnRyeTogQXVkaXRMb2dFbnRyeSA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbW9kdWxlOiB0b29sQ2FsbC5tb2R1bGUsXG4gICAgICBtZXRob2Q6IHRvb2xDYWxsLm1ldGhvZCxcbiAgICAgIGFyZ3M6IHRvb2xDYWxsLmFyZ3MsXG4gICAgICByaXNrTGV2ZWwsXG4gICAgICBkZWNpc2lvbixcbiAgICAgIHNvdXJjZSxcbiAgICAgIHVzZXJJZCxcbiAgICAgIHRva2VuVXNlZDogdXNlcklkICE9PSB1bmRlZmluZWQsXG4gICAgICBtYXRjaGVkUHJvZmlsZSxcbiAgICAgIHRydXN0U2NvcmUsXG4gICAgICBhbmFseXNpcyxcbiAgICB9O1xuICAgIGF3YWl0IHRoaXMuYXVkaXRMb2cuYXBwZW5kKGVudHJ5KTtcbiAgfVxuXG4gIHByaXZhdGUgY2xlYXJWYWxpZGF0aW9uKHJlcXVlc3RJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy52YWxpZGF0aW9uUmVzdWx0cy5kZWxldGUocmVxdWVzdElkKTtcbiAgICBjb25zb2xlLmxvZygnW0ludGVyY2VwdG9yXSDpqozor4Hnu5Pmnpzlt7LmuIXpmaQ6JywgcmVxdWVzdElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5blvoXlrqHmibnor7fmsYLliJfooahcbiAgICovXG4gIGdldFBlbmRpbmdSZXF1ZXN0cygpOiBBcHByb3ZhbFJlcXVlc3RbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5wZW5kaW5nUmVxdWVzdHMudmFsdWVzKCkpO1xuICB9XG59XG4iXX0=