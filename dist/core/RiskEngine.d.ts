/**
 * LLM 风险评估引擎
 */
import { ToolCall, RiskAssessment } from '../types';
interface LLMConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
}
export declare class RiskEngine {
    private config;
    private readonly RISK_PROMPT;
    constructor(llmConfig?: any);
    /**
     * 评估工具调用风险
     */
    assess(toolCall: ToolCall): Promise<RiskAssessment>;
    /**
     * 调用 LLM API（带重试）
     */
    private callLLM;
    /**
     * 获取模拟响应 (API 不可用时)
     */
    private getMockResponse;
    /**
     * 解析 LLM 响应
     */
    private parseLLMResponse;
    /**
     * 降级响应（当 JSON 解析失败或 API 不可用时）
     */
    private getFallbackResponse;
    /**
     * 获取当前配置 (用于调试)
     */
    getConfig(): LLMConfig | null;
}
export {};
