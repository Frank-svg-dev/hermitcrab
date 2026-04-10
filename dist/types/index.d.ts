/**
 * 工具调用信息
 */
export interface ToolCall {
    id: string;
    module: string;
    method: string;
    args: any[];
    timestamp: number;
}
/**
 * 风险等级
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
/**
 * 决策类型
 */
export type Decision = 'ALLOW' | 'DENY' | 'PENDING';
/**
 * 决策来源
 */
export type DecisionSource = 'LLM' | 'HUMAN' | 'PROFILE';
/**
 * LLM 风险评估结果
 */
export interface RiskAssessment {
    riskLevel: RiskLevel;
    confidence: number;
    analysis: string;
    factors: string[];
    recommendation: 'ALLOW' | 'ASK' | 'DENY';
}
/**
 * 用户画像
 */
export interface UserProfile {
    fingerprint: string;
    userId: string;
    decisions: DecisionRecord[];
    trustScore: number;
    lastUsed: number;
    createdAt: number;
}
/**
 * 决策记录
 */
export interface DecisionRecord {
    timestamp: number;
    decision: 'APPROVED' | 'DENIED';
    context?: string;
}
/**
 * 审批请求
 */
export interface ApprovalRequest {
    id: string;
    toolCall: ToolCall;
    riskAssessment: RiskAssessment;
    status: 'PENDING' | 'APPROVED' | 'DENIED';
    createdAt: number;
    expiresAt: number;
}
/**
 * 令牌信息
 */
export interface TokenInfo {
    id: string;
    hash: string;
    createdAt: number;
    lastUsed: number;
    permissions: string[];
}
/**
 * 审计日志条目
 */
export interface AuditLogEntry {
    timestamp: string;
    module: string;
    method: string;
    args: any[];
    riskLevel: RiskLevel;
    decision: string;
    source: DecisionSource;
    userId?: string;
    tokenUsed?: boolean;
    matchedProfile?: string;
    trustScore?: number;
    analysis?: string;
}
/**
 * 拦截器配置
 */
export interface InterceptorConfig {
    riskThresholds: {
        autoAllow: RiskLevel;
        autoDeny: RiskLevel;
        humanReview: RiskLevel[];
    };
    profileMatching: {
        enabled: boolean;
        trustThreshold: number;
        similarityThreshold: number;
    };
    token: {
        algorithm: string;
        memoryCost: number;
        timeCost: number;
        parallelism: number;
    };
    learning: {
        enabled: boolean;
        decayDays: number;
        decayFactor: number;
    };
    llm?: {
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        timeout?: number;
    };
    profile?: {
        enabled?: boolean;
        trustThreshold?: number;
        decayDays?: number;
    };
}
/**
 * 拦截器返回结果
 */
export interface InterceptResult {
    block: boolean;
    reason?: string;
    message: string;
    requestId?: string;
}
/**
 * 默认配置
 */
export declare const DEFAULT_CONFIG: InterceptorConfig;
