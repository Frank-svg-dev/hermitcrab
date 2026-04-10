/**
 * 核心拦截器 - 处理 before_tool_call 事件
 */
import { ToolCall, ApprovalRequest, InterceptResult } from '../types';
export declare class Interceptor {
    private riskEngine;
    private profileMatcher;
    private tokenValidator;
    private auditLog;
    private memoryStore;
    private pendingRequests;
    private validationResults;
    constructor(config?: any, llmConfig?: any);
    /**
     * 生成操作指纹
     */
    generateFingerprint(toolCall: ToolCall): string;
    /**
     * 标准化参数 (用于指纹生成)
     * - 文件路径：具体路径 → 通配符模式
     * - 命令：具体值 → 占位符
     */
    private normalizeArgs;
    /**
     * 拦截工具调用 (before_tool_call 钩子)
     * 返回：{ block: true } 阻止执行 | { block: false } 允许执行
     */
    intercept(toolCall: ToolCall): Promise<InterceptResult>;
    private checkValidationByFingerprint;
    /**
     * 创建审批请求
     */
    private createApprovalRequest;
    /**
     * 发送审批请求给用户
     */
    /**
     * 处理用户响应 (clawbands_respond 工具)
     */
    respond(requestId: string, userInput: string): Promise<{
        approved: boolean;
        reason?: string;
    }>;
    /**
     * 记录审计日志
     */
    private logDecision;
    private clearValidation;
    /**
     * 获取待审批请求列表
     */
    getPendingRequests(): ApprovalRequest[];
}
