/**
 * OpenClaw 插件入口 - HermitCrab
 *
 * 配置方式 (在 openclaw.json 中):
 * {
 *   "plugins": {
 *     "entries": {
 *       "hermitcrab": {
 *         "enabled": true,
 *         "config": {
 *           "llm": {
 *             "baseUrl": "https://cdn.12ai.org/v1",
 *             "apiKey": "sk-your-api-key",
 *             "model": "qwen3.5-plus"
 *           },
 *           "token": {
 *             "secret": "your-token-secret"
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
import { ToolCall } from '../types';
/**
 * OpenClaw 插件定义
 */
export declare const plugin: {
    id: string;
    name: string;
    description: string;
    /**
     * 配置 Schema (JSON Schema)
     */
    configSchema: {
        schema: {
            type: string;
            additionalProperties: boolean;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                llm: {
                    type: string;
                    description: string;
                    properties: {
                        baseUrl: {
                            type: string;
                            description: string;
                            default: string;
                        };
                        apiKey: {
                            type: string;
                            description: string;
                            writeOnly: boolean;
                        };
                        model: {
                            type: string;
                            description: string;
                            default: string;
                        };
                        temperature: {
                            type: string;
                            description: string;
                            default: number;
                        };
                        maxTokens: {
                            type: string;
                            description: string;
                            default: number;
                        };
                        timeout: {
                            type: string;
                            description: string;
                            default: number;
                        };
                    };
                };
                token: {
                    type: string;
                    description: string;
                    properties: {
                        secret: {
                            type: string;
                            description: string;
                            writeOnly: boolean;
                        };
                        algorithm: {
                            type: string;
                            description: string;
                            default: string;
                        };
                    };
                };
                profile: {
                    type: string;
                    description: string;
                    properties: {
                        enabled: {
                            type: string;
                            description: string;
                            default: boolean;
                        };
                        trustThreshold: {
                            type: string;
                            description: string;
                            default: number;
                        };
                        decayDays: {
                            type: string;
                            description: string;
                            default: number;
                        };
                    };
                };
                riskThresholds: {
                    type: string;
                    description: string;
                    properties: {
                        autoAllow: {
                            type: string;
                            description: string;
                            default: string;
                        };
                        autoDeny: {
                            type: string;
                            description: string;
                            default: string;
                        };
                        humanReview: {
                            type: string;
                            description: string;
                            default: string[];
                        };
                    };
                };
            };
        };
    };
    /**
     * 插件注册函数
     */
    register(api: any): void;
    /**
     * 插件卸载
     */
    unregister(): void;
};
/**
 * 初始化插件 (兼容旧用法)
 */
export declare function init(config?: any): Promise<void>;
/**
 * before_tool_call 钩子处理器 (兼容旧用法)
 */
export declare function onBeforeToolCall(toolCall: ToolCall): Promise<{
    block: boolean;
    reason?: string;
}>;
/**
 * 获取插件配置
 */
export declare function getConfig(): any;
/**
 * 获取待审批请求列表
 */
export declare function getPendingRequests(): any[];
/**
 * 默认导出插件对象
 */
export default plugin;
