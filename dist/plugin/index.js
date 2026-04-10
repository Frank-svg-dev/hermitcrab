"use strict";
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
exports.getPendingRequests = exports.getConfig = exports.onBeforeToolCall = exports.init = exports.plugin = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Interceptor_1 = require("../core/Interceptor");
const types_1 = require("../types");
let interceptor = null;
/**
 * OpenClaw 插件定义
 */
exports.plugin = {
    id: 'hermitcrab',
    name: 'HermitCrab',
    description: 'LLM-powered security middleware with token auth and profile learning',
    /**
     * 配置 Schema (JSON Schema)
     */
    configSchema: {
        schema: {
            type: 'object',
            additionalProperties: true,
            properties: {
                enabled: {
                    type: 'boolean',
                    description: '是否启用插件',
                    default: true,
                },
                llm: {
                    type: 'object',
                    description: 'LLM 配置',
                    properties: {
                        baseUrl: {
                            type: 'string',
                            description: 'LLM API 基础 URL',
                            default: 'https://cdn.12ai.org/v1',
                        },
                        apiKey: {
                            type: 'string',
                            description: 'LLM API 密钥',
                            writeOnly: true,
                        },
                        model: {
                            type: 'string',
                            description: 'LLM 模型名称',
                            default: 'qwen3.5-plus',
                        },
                        temperature: {
                            type: 'number',
                            description: '温度参数',
                            default: 0.3,
                        },
                        maxTokens: {
                            type: 'number',
                            description: '最大输出 token 数',
                            default: 1024,
                        },
                        timeout: {
                            type: 'number',
                            description: '超时时间 (毫秒)',
                            default: 30000,
                        },
                    },
                },
                token: {
                    type: 'object',
                    description: '令牌配置',
                    properties: {
                        secret: {
                            type: 'string',
                            description: '令牌密钥',
                            writeOnly: true,
                        },
                        algorithm: {
                            type: 'string',
                            description: '哈希算法',
                            default: 'sha256',
                        },
                    },
                },
                profile: {
                    type: 'object',
                    description: '用户画像配置',
                    properties: {
                        enabled: {
                            type: 'boolean',
                            description: '是否启用画像学习',
                            default: true,
                        },
                        trustThreshold: {
                            type: 'number',
                            description: '信任阈值',
                            default: 0.8,
                        },
                        decayDays: {
                            type: 'number',
                            description: '画像衰减天数',
                            default: 30,
                        },
                    },
                },
                riskThresholds: {
                    type: 'object',
                    description: '风险阈值配置',
                    properties: {
                        autoAllow: {
                            type: 'string',
                            description: '自动允许的风险等级',
                            default: 'LOW',
                        },
                        autoDeny: {
                            type: 'string',
                            description: '自动拒绝的风险等级',
                            default: 'HIGH',
                        },
                        humanReview: {
                            type: 'array',
                            description: '需要人工审查的风险等级',
                            default: ['MEDIUM', 'HIGH'],
                        },
                    },
                },
            },
        },
    },
    /**
     * 插件注册函数
     */
    register(api) {
        console.log('[HermitCrab] 插件注册中...');
        // 直接读取 openclaw.json 获取配置
        const configPath = path.join(process.env.HOME || '/home/node', '.openclaw', 'openclaw.json');
        let pluginConfig = {};
        try {
            const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            pluginConfig = fullConfig.plugins?.entries?.['hermitcrab']?.config || {};
            console.log('[HermitCrab] 读取配置成功');
        }
        catch (e) {
            console.warn('[HermitCrab] 无法读取配置文件:', e.message);
            console.warn('[HermitCrab] 将使用默认配置');
        }
        console.log('[HermitCrab] 配置:', JSON.stringify(pluginConfig, null, 2));
        // 合并默认配置和用户配置
        const mergedConfig = {
            ...types_1.DEFAULT_CONFIG,
            ...pluginConfig,
            llm: {
                ...types_1.DEFAULT_CONFIG.llm,
                ...pluginConfig?.llm,
            },
            profile: {
                ...types_1.DEFAULT_CONFIG.profile,
                ...pluginConfig?.profile,
            },
            riskThresholds: {
                ...types_1.DEFAULT_CONFIG.riskThresholds,
                ...pluginConfig?.riskThresholds,
            },
        };
        // 初始化拦截器 (传入配置)
        interceptor = new Interceptor_1.Interceptor(mergedConfig, pluginConfig?.llm);
        console.log('[HermitCrab] 拦截器初始化完成');
        console.log('[HermitCrab] LLM 配置:', pluginConfig?.llm?.model || '使用默认模型');
        // 注册 before_tool_call 钩子
        api.on('before_tool_call', async (event) => {
            const toolCall = {
                id: event.toolCallId || crypto.randomUUID(),
                module: event.toolName?.split('.')[0] || 'Unknown',
                method: event.toolName?.split('.')[1] || event.toolName || 'unknown',
                args: Array.isArray(event.params) ? event.params : [event.params || {}],
                timestamp: Date.now(),
            };
            console.log('[HermitCrab] 拦截工具调用:', toolCall.module, toolCall.method);
            try {
                const result = await interceptor.intercept(toolCall);
                // 如果需要阻止工具调用
                if (result.block) {
                    // 检查 event 是否支持 preventDefault
                    if (typeof event.preventDefault === 'function') {
                        event.preventDefault();
                        event.blockReason = result.reason || 'BLOCKED_BY_LLM_CLAWBANDS';
                    }
                    console.log('[HermitCrab] 已阻止:', result.reason);
                    return { block: true, blockReason: result.message };
                }
                else if (result.block == undefined) {
                    return { block: true, message: result.message };
                }
                return { block: false, message: result.message };
            }
            catch (error) {
                console.error('[HermitCrab] 拦截器错误:', error);
                return { block: true, message: "INTERCEPTOR_ERROR, 需要人工确认" };
            }
        });
        api.on('message_received', async (event) => {
            const message = event.content || event.text || event.message || '';
            if (message) {
                await handleUserMessage(api, message);
            }
        });
        api.on('before_message_write', (event) => {
            const { message } = event.payload;
            if (typeof message?.content !== 'string') {
                return undefined;
            }
            let content = message.content;
            // ================== 你的脱敏规则（仅影响显示） ==================
            content = content
                .replace(/http[s]?:\/\/[^\s<>"']+/gi, 'http://[网络地址已脱敏]')
                .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, '[IP地址已脱敏]')
                .replace(/sk-[a-zA-Z0-9]{30,}/gi, 'sk-***REDACTED***')
                .replace(/1[3-9]\d{9}/g, '1*********');
            // 可以继续加更多规则...
            message.content = content;
            return undefined;
        });
        console.log('[HermitCrab] 插件注册完成');
    },
    /**
     * 插件卸载
     */
    unregister() {
        console.log('[HermitCrab] 插件卸载中...');
        interceptor = null;
        console.log('[HermitCrab] 插件已卸载');
    },
};
/**
 * 初始化插件 (兼容旧用法)
 */
async function init(config) {
    console.log('[HermitCrab] 插件初始化...');
    interceptor = new Interceptor_1.Interceptor(types_1.DEFAULT_CONFIG, config?.llm);
    console.log('[HermitCrab] 插件初始化完成');
}
exports.init = init;
async function handleUserMessage(api, message) {
    // 检查是否是审批回复格式：[token] [YES/NO]
    const match = message.trim().match(/^(\S+)\s+(YES|NO)$/i);
    if (!match) {
        return; // 不是审批回复
    }
    const [, token, decision] = match;
    console.log('[HermitCrab] 收到审批回复:', token, decision);
    // 获取待审批请求
    const pending = interceptor?.getPendingRequests();
    if (!pending || pending.length === 0) {
        console.log('[HermitCrab] 没有待审批的请求');
        return;
    }
    // 处理最新的审批请求
    const requestId = pending[0].id;
    const result = await interceptor?.respond(requestId, `${token} ${decision}`);
    if (result?.approved) {
        console.log('[HermitCrab] 校验通过，重试工具调用');
        return { block: false, blockReason: '校验通过，重试工具调用' };
        // TODO: 重试工具调用
    }
    else {
        console.log('[HermitCrab] 校验失败:', result?.reason);
        return { block: true, blockReason: '校验失败，需要重新输入正确的口令' };
    }
}
async function sendMessage(api, content) {
    try {
        // 尝试使用 channel API
        if (api?.channel?.send) {
            await api.channel.send({
                type: 'text',
                content: content,
                to: 'current',
            });
        }
        else if (api?.send) {
            await api.send(content);
        }
        else {
            console.log('[HermitCrab] 消息:', content);
        }
    }
    catch (error) {
        console.error('[HermitCrab] 发送消息失败:', error.message);
    }
}
/**
 * before_tool_call 钩子处理器 (兼容旧用法)
 */
async function onBeforeToolCall(toolCall) {
    if (!interceptor) {
        console.warn('[HermitCrab] 插件未初始化，放行工具调用');
        return { block: false };
    }
    try {
        return await interceptor.intercept(toolCall);
    }
    catch (error) {
        console.error('[HermitCrab] 拦截器错误:', error);
        return { block: false };
    }
}
exports.onBeforeToolCall = onBeforeToolCall;
/**
 * 获取插件配置
 */
function getConfig() {
    // 配置在 register 时已传入拦截器，此处返回空对象
    return {};
}
exports.getConfig = getConfig;
/**
 * 获取待审批请求列表
 */
function getPendingRequests() {
    if (!interceptor) {
        return [];
    }
    return [];
}
exports.getPendingRequests = getPendingRequests;
/**
 * 默认导出插件对象
 */
exports.default = exports.plugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGx1Z2luL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F1Qkc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWlDO0FBQ2pDLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IscURBQWtEO0FBQ2xELG9DQUF1RTtBQUV2RSxJQUFJLFdBQVcsR0FBdUIsSUFBSSxDQUFDO0FBRTNDOztHQUVHO0FBQ1UsUUFBQSxNQUFNLEdBQUc7SUFDcEIsRUFBRSxFQUFFLFlBQVk7SUFDaEIsSUFBSSxFQUFFLFlBQVk7SUFDbEIsV0FBVyxFQUFFLHNFQUFzRTtJQUVuRjs7T0FFRztJQUNILFlBQVksRUFBRTtRQUNaLE1BQU0sRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2Qsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQixVQUFVLEVBQUU7Z0JBQ1YsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxTQUFTO29CQUNmLFdBQVcsRUFBRSxRQUFRO29CQUNyQixPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxHQUFHLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVE7b0JBQ3JCLFVBQVUsRUFBRTt3QkFDVixPQUFPLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGdCQUFnQjs0QkFDN0IsT0FBTyxFQUFFLHlCQUF5Qjt5QkFDbkM7d0JBQ0QsTUFBTSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxZQUFZOzRCQUN6QixTQUFTLEVBQUUsSUFBSTt5QkFDaEI7d0JBQ0QsS0FBSyxFQUFFOzRCQUNMLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxVQUFVOzRCQUN2QixPQUFPLEVBQUUsY0FBYzt5QkFDeEI7d0JBQ0QsV0FBVyxF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RztBQUNILGtCQUFlLGNBQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogT3BlbkNsYXcg5o+S5Lu25YWl5Y+jIC0gSGVybWl0Q3JhYlxuICogXG4gKiDphY3nva7mlrnlvI8gKOWcqCBvcGVuY2xhdy5qc29uIOS4rSk6XG4gKiB7XG4gKiAgIFwicGx1Z2luc1wiOiB7XG4gKiAgICAgXCJlbnRyaWVzXCI6IHtcbiAqICAgICAgIFwiaGVybWl0Y3JhYlwiOiB7XG4gKiAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlLFxuICogICAgICAgICBcImNvbmZpZ1wiOiB7XG4gKiAgICAgICAgICAgXCJsbG1cIjoge1xuICogICAgICAgICAgICAgXCJiYXNlVXJsXCI6IFwiaHR0cHM6Ly9jZG4uMTJhaS5vcmcvdjFcIixcbiAqICAgICAgICAgICAgIFwiYXBpS2V5XCI6IFwic2steW91ci1hcGkta2V5XCIsXG4gKiAgICAgICAgICAgICBcIm1vZGVsXCI6IFwicXdlbjMuNS1wbHVzXCJcbiAqICAgICAgICAgICB9LFxuICogICAgICAgICAgIFwidG9rZW5cIjoge1xuICogICAgICAgICAgICAgXCJzZWNyZXRcIjogXCJ5b3VyLXRva2VuLXNlY3JldFwiXG4gKiAgICAgICAgICAgfVxuICogICAgICAgICB9XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKi9cblxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW50ZXJjZXB0b3IgfSBmcm9tICcuLi9jb3JlL0ludGVyY2VwdG9yJztcbmltcG9ydCB7IFRvb2xDYWxsLCBJbnRlcmNlcHRvckNvbmZpZywgREVGQVVMVF9DT05GSUcgfSBmcm9tICcuLi90eXBlcyc7XG5cbmxldCBpbnRlcmNlcHRvcjogSW50ZXJjZXB0b3IgfCBudWxsID0gbnVsbDtcblxuLyoqXG4gKiBPcGVuQ2xhdyDmj5Lku7blrprkuYlcbiAqL1xuZXhwb3J0IGNvbnN0IHBsdWdpbiA9IHtcbiAgaWQ6ICdoZXJtaXRjcmFiJyxcbiAgbmFtZTogJ0hlcm1pdENyYWInLFxuICBkZXNjcmlwdGlvbjogJ0xMTS1wb3dlcmVkIHNlY3VyaXR5IG1pZGRsZXdhcmUgd2l0aCB0b2tlbiBhdXRoIGFuZCBwcm9maWxlIGxlYXJuaW5nJyxcbiAgXG4gIC8qKlxuICAgKiDphY3nva4gU2NoZW1hIChKU09OIFNjaGVtYSlcbiAgICovXG4gIGNvbmZpZ1NjaGVtYToge1xuICAgIHNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogdHJ1ZSxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZW5hYmxlZDogeyBcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICfmmK/lkKblkK/nlKjmj5Lku7YnLFxuICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGxsbToge1xuICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTExNIOmFjee9ricsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgYmFzZVVybDoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMTE0gQVBJIOWfuuehgCBVUkwnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiAnaHR0cHM6Ly9jZG4uMTJhaS5vcmcvdjEnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFwaUtleToge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMTE0gQVBJIOWvhumSpScsXG4gICAgICAgICAgICAgIHdyaXRlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtb2RlbDoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMTE0g5qih5Z6L5ZCN56ewJyxcbiAgICAgICAgICAgICAgZGVmYXVsdDogJ3F3ZW4zLjUtcGx1cycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGVyYXR1cmU6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAn5rip5bqm5Y+C5pWwJyxcbiAgICAgICAgICAgICAgZGVmYXVsdDogMC4zLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1heFRva2Vuczoge1xuICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICfmnIDlpKfovpPlh7ogdG9rZW4g5pWwJyxcbiAgICAgICAgICAgICAgZGVmYXVsdDogMTAyNCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ+i2heaXtuaXtumXtCAo5q+r56eSKScsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IDMwMDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0b2tlbjoge1xuICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAn5Luk54mM6YWN572uJyxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAn5Luk54mM5a+G6ZKlJyxcbiAgICAgICAgICAgICAgd3JpdGVPbmx5OiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsZ29yaXRobToge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICflk4jluIznrpfms5UnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiAnc2hhMjU2JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgcHJvZmlsZToge1xuICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAn55So5oi355S75YOP6YWN572uJyxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICfmmK/lkKblkK/nlKjnlLvlg4/lrabkuaAnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRydXN0VGhyZXNob2xkOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ+S/oeS7u+mYiOWAvCcsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IDAuOCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWNheURheXM6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAn55S75YOP6KGw5YeP5aSp5pWwJyxcbiAgICAgICAgICAgICAgZGVmYXVsdDogMzAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHJpc2tUaHJlc2hvbGRzOiB7XG4gICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICfpo47pmanpmIjlgLzphY3nva4nLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIGF1dG9BbGxvdzoge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICfoh6rliqjlhYHorrjnmoTpo47pmannrYnnuqcnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiAnTE9XJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhdXRvRGVueToge1xuICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICfoh6rliqjmi5Lnu53nmoTpo47pmannrYnnuqcnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiAnSElHSCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaHVtYW5SZXZpZXc6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICfpnIDopoHkurrlt6XlrqHmn6XnmoTpo47pmannrYnnuqcnLFxuICAgICAgICAgICAgICBkZWZhdWx0OiBbJ01FRElVTScsICdISUdIJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG5cbiAgLyoqXG4gICAqIOaPkuS7tuazqOWGjOWHveaVsFxuICAgKi9cbiAgcmVnaXN0ZXIoYXBpOiBhbnkpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0hlcm1pdENyYWJdIOaPkuS7tuazqOWGjOS4rS4uLicpO1xuICAgIFxuICAgIC8vIOebtOaOpeivu+WPliBvcGVuY2xhdy5qc29uIOiOt+WPlumFjee9rlxuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5lbnYuSE9NRSB8fCAnL2hvbWUvbm9kZScsICcub3BlbmNsYXcnLCAnb3BlbmNsYXcuanNvbicpO1xuICAgIGxldCBwbHVnaW5Db25maWc6IGFueSA9IHt9O1xuICAgIFxuICAgIHRyeSB7XG4gICAgICBjb25zdCBmdWxsQ29uZmlnID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY29uZmlnUGF0aCwgJ3V0Zi04JykpO1xuICAgICAgcGx1Z2luQ29uZmlnID0gZnVsbENvbmZpZy5wbHVnaW5zPy5lbnRyaWVzPy5bJ2hlcm1pdGNyYWInXT8uY29uZmlnIHx8IHt9O1xuICAgICAgY29uc29sZS5sb2coJ1tIZXJtaXRDcmFiXSDor7vlj5bphY3nva7miJDlip8nKTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0hlcm1pdENyYWJdIOaXoOazleivu+WPlumFjee9ruaWh+S7tjonLCBlLm1lc3NhZ2UpO1xuICAgICAgY29uc29sZS53YXJuKCdbSGVybWl0Q3JhYl0g5bCG5L2/55So6buY6K6k6YWN572uJyk7XG4gICAgfVxuICAgIFxuICAgIGNvbnNvbGUubG9nKCdbSGVybWl0Q3JhYl0g6YWN572uOicsIEpTT04uc3RyaW5naWZ5KHBsdWdpbkNvbmZpZywgbnVsbCwgMikpO1xuXG4gICAgLy8g5ZCI5bm26buY6K6k6YWN572u5ZKM55So5oi36YWN572uXG4gICAgY29uc3QgbWVyZ2VkQ29uZmlnOiBJbnRlcmNlcHRvckNvbmZpZyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfQ09ORklHLFxuICAgICAgLi4ucGx1Z2luQ29uZmlnLFxuICAgICAgbGxtOiB7XG4gICAgICAgIC4uLkRFRkFVTFRfQ09ORklHLmxsbSxcbiAgICAgICAgLi4ucGx1Z2luQ29uZmlnPy5sbG0sXG4gICAgICB9LFxuICAgICAgcHJvZmlsZToge1xuICAgICAgICAuLi5ERUZBVUxUX0NPTkZJRy5wcm9maWxlLFxuICAgICAgICAuLi5wbHVnaW5Db25maWc/LnByb2ZpbGUsXG4gICAgICB9LFxuICAgICAgcmlza1RocmVzaG9sZHM6IHtcbiAgICAgICAgLi4uREVGQVVMVF9DT05GSUcucmlza1RocmVzaG9sZHMsXG4gICAgICAgIC4uLnBsdWdpbkNvbmZpZz8ucmlza1RocmVzaG9sZHMsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyDliJ3lp4vljJbmi6bmiKrlmaggKOS8oOWFpemFjee9rilcbiAgICBpbnRlcmNlcHRvciA9IG5ldyBJbnRlcmNlcHRvcihtZXJnZWRDb25maWcsIHBsdWdpbkNvbmZpZz8ubGxtKTtcbiAgICBjb25zb2xlLmxvZygnW0hlcm1pdENyYWJdIOaLpuaIquWZqOWIneWni+WMluWujOaIkCcpO1xuICAgIGNvbnNvbGUubG9nKCdbSGVybWl0Q3JhYl0gTExNIOmFjee9rjonLCBwbHVnaW5Db25maWc/LmxsbT8ubW9kZWwgfHwgJ+S9v+eUqOm7mOiupOaooeWeiycpO1xuXG4gICAgLy8g5rOo5YaMIGJlZm9yZV90b29sX2NhbGwg6ZKp5a2QXG4gICAgYXBpLm9uKCdiZWZvcmVfdG9vbF9jYWxsJywgYXN5bmMgKGV2ZW50OiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IHRvb2xDYWxsOiBUb29sQ2FsbCA9IHtcbiAgICAgICAgaWQ6IGV2ZW50LnRvb2xDYWxsSWQgfHwgY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgICAgbW9kdWxlOiBldmVudC50b29sTmFtZT8uc3BsaXQoJy4nKVswXSB8fCAnVW5rbm93bicsXG4gICAgICAgIG1ldGhvZDogZXZlbnQudG9vbE5hbWU/LnNwbGl0KCcuJylbMV0gfHwgZXZlbnQudG9vbE5hbWUgfHwgJ3Vua25vd24nLFxuICAgICAgICBhcmdzOiBBcnJheS5pc0FycmF5KGV2ZW50LnBhcmFtcykgPyBldmVudC5wYXJhbXMgOiBbZXZlbnQucGFyYW1zIHx8IHt9XSxcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgfTtcblxuICAgICAgY29uc29sZS5sb2coJ1tIZXJtaXRDcmFiXSDmi6bmiKrlt6XlhbfosIPnlKg6JywgdG9vbENhbGwubW9kdWxlLCB0b29sQ2FsbC5tZXRob2QpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbnRlcmNlcHRvciEuaW50ZXJjZXB0KHRvb2xDYWxsKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOWmguaenOmcgOimgemYu+atouW3peWFt+iwg+eUqFxuICAgICAgICBpZiAocmVzdWx0LmJsb2NrKSB7XG4gICAgICAgICAgLy8g5qOA5p+lIGV2ZW50IOaYr+WQpuaUr+aMgSBwcmV2ZW50RGVmYXVsdFxuICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQucHJldmVudERlZmF1bHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBldmVudC5ibG9ja1JlYXNvbiA9IHJlc3VsdC5yZWFzb24gfHwgJ0JMT0NLRURfQllfTExNX0NMQVdCQU5EUyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbSGVybWl0Q3JhYl0g5bey6Zi75q2iOicsIHJlc3VsdC5yZWFzb24pO1xuICAgICAgICAgIHJldHVybiB7IGJsb2NrOiB0cnVlLCBibG9ja1JlYXNvbjogcmVzdWx0Lm1lc3NhZ2UgfTtcbiAgICAgICAgfWVsc2UgaWYgKHJlc3VsdC5ibG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4geyBibG9jazogdHJ1ZSwgbWVzc2FnZTogcmVzdWx0Lm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBibG9jazogZmFsc2UsIG1lc3NhZ2U6IHJlc3VsdC5tZXNzYWdlIH07XG5cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tIZXJtaXRDcmFiXSDmi6bmiKrlmajplJnor686JywgZXJyb3IpO1xuICAgICAgICByZXR1cm4geyBibG9jazogdHJ1ZSwgbWVzc2FnZTogXCJJTlRFUkNFUFRPUl9FUlJPUiwg6ZyA6KaB5Lq65bel56Gu6K6kXCIgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgYXBpLm9uKCdtZXNzYWdlX3JlY2VpdmVkJywgYXN5bmMgKGV2ZW50OiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBldmVudC5jb250ZW50IHx8IGV2ZW50LnRleHQgfHwgZXZlbnQubWVzc2FnZSB8fCAnJztcbiAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgIGF3YWl0IGhhbmRsZVVzZXJNZXNzYWdlKGFwaSwgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIGFwaS5vbignYmVmb3JlX21lc3NhZ2Vfd3JpdGUnLCAoZXZlbnQ6IGFueSkgPT4ge1xuICAgICAgY29uc3QgeyBtZXNzYWdlIH0gPSBldmVudC5wYXlsb2FkO1xuICBcbiAgICAgIGlmICh0eXBlb2YgbWVzc2FnZT8uY29udGVudCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGxldCBjb250ZW50ID0gbWVzc2FnZS5jb250ZW50O1xuXG4gIC8vID09PT09PT09PT09PT09PT09PSDkvaDnmoTohLHmlY/op4TliJnvvIjku4XlvbHlk43mmL7npLrvvIkgPT09PT09PT09PT09PT09PT09XG4gICAgICBjb250ZW50ID0gY29udGVudFxuICAgICAgICAucmVwbGFjZSgvaHR0cFtzXT86XFwvXFwvW15cXHM8PlwiJ10rL2dpLCAnaHR0cDovL1vnvZHnu5zlnLDlnYDlt7LohLHmlY9dJylcbiAgICAgICAgLnJlcGxhY2UoL1xcYlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9KDpcXGQrKT9cXGIvZywgJ1tJUOWcsOWdgOW3suiEseaVj10nKVxuICAgICAgICAucmVwbGFjZSgvc2stW2EtekEtWjAtOV17MzAsfS9naSwgJ3NrLSoqKlJFREFDVEVEKioqJylcbiAgICAgICAgLnJlcGxhY2UoLzFbMy05XVxcZHs5fS9nLCAnMSoqKioqKioqKicpXG4gICAgLy8g5Y+v5Lul57un57ut5Yqg5pu05aSa6KeE5YiZLi4uXG5cbiAgICAgIG1lc3NhZ2UuY29udGVudCA9IGNvbnRlbnQ7XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7IFxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coJ1tIZXJtaXRDcmFiXSDmj5Lku7bms6jlhozlrozmiJAnKTtcbiAgfSxcblxuICAvKipcbiAgICog5o+S5Lu25Y246L29XG4gICAqL1xuICB1bnJlZ2lzdGVyKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbSGVybWl0Q3JhYl0g5o+S5Lu25Y246L295LitLi4uJyk7XG4gICAgaW50ZXJjZXB0b3IgPSBudWxsO1xuICAgIGNvbnNvbGUubG9nKCdbSGVybWl0Q3JhYl0g5o+S5Lu25bey5Y246L29Jyk7XG4gIH0sXG59O1xuXG4vKipcbiAqIOWIneWni+WMluaPkuS7tiAo5YW85a655pen55So5rOVKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdChjb25maWc/OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc29sZS5sb2coJ1tIZXJtaXRDcmFiXSDmj5Lku7bliJ3lp4vljJYuLi4nKTtcbiAgaW50ZXJjZXB0b3IgPSBuZXcgSW50ZXJjZXB0b3IoREVGQVVMVF9DT05GSUcsIGNvbmZpZz8ubGxtKTtcbiAgY29uc29sZS5sb2coJ1tIZXJtaXRDcmFiXSDmj5Lku7bliJ3lp4vljJblrozmiJAnKTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVVc2VyTWVzc2FnZShhcGk6IGFueSwgbWVzc2FnZTogc3RyaW5nKSB7XG4gIC8vIOajgOafpeaYr+WQpuaYr+WuoeaJueWbnuWkjeagvOW8j++8mlt0b2tlbl0gW1lFUy9OT11cbiAgY29uc3QgbWF0Y2ggPSBtZXNzYWdlLnRyaW0oKS5tYXRjaCgvXihcXFMrKVxccysoWUVTfE5PKSQvaSk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm47IC8vIOS4jeaYr+WuoeaJueWbnuWkjVxuICB9XG5cbiAgY29uc3QgWywgdG9rZW4sIGRlY2lzaW9uXSA9IG1hdGNoO1xuICBjb25zb2xlLmxvZygnW0hlcm1pdENyYWJdIOaUtuWIsOWuoeaJueWbnuWkjTonLCB0b2tlbiwgZGVjaXNpb24pO1xuXG4gIC8vIOiOt+WPluW+heWuoeaJueivt+axglxuICBjb25zdCBwZW5kaW5nID0gaW50ZXJjZXB0b3I/LmdldFBlbmRpbmdSZXF1ZXN0cygpO1xuICBpZiAoIXBlbmRpbmcgfHwgcGVuZGluZy5sZW5ndGggPT09IDApIHtcbiAgICBjb25zb2xlLmxvZygnW0hlcm1pdENyYWJdIOayoeacieW+heWuoeaJueeahOivt+axgicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIOWkhOeQhuacgOaWsOeahOWuoeaJueivt+axglxuICBjb25zdCByZXF1ZXN0SWQgPSBwZW5kaW5nWzBdLmlkO1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbnRlcmNlcHRvcj8ucmVzcG9uZChyZXF1ZXN0SWQsIGAke3Rva2VufSAke2RlY2lzaW9ufWApO1xuXG4gIGlmIChyZXN1bHQ/LmFwcHJvdmVkKSB7XG4gICAgY29uc29sZS5sb2coJ1tIZXJtaXRDcmFiXSDmoKHpqozpgJrov4fvvIzph43or5Xlt6XlhbfosIPnlKgnKTtcbiAgICByZXR1cm4geyBibG9jazogZmFsc2UsIGJsb2NrUmVhc29uOiAn5qCh6aqM6YCa6L+H77yM6YeN6K+V5bel5YW36LCD55SoJyB9O1xuICAgIC8vIFRPRE86IOmHjeivleW3peWFt+iwg+eUqFxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdbSGVybWl0Q3JhYl0g5qCh6aqM5aSx6LSlOicsIHJlc3VsdD8ucmVhc29uKTtcbiAgICByZXR1cm4geyBibG9jazogdHJ1ZSwgYmxvY2tSZWFzb246ICfmoKHpqozlpLHotKXvvIzpnIDopoHph43mlrDovpPlhaXmraPnoa7nmoTlj6Pku6QnIH07XG4gIH1cbn1cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIHNlbmRNZXNzYWdlKGFwaTogYW55LCBjb250ZW50OiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICAvLyDlsJ3or5Xkvb/nlKggY2hhbm5lbCBBUElcbiAgICBpZiAoYXBpPy5jaGFubmVsPy5zZW5kKSB7XG4gICAgICBhd2FpdCBhcGkuY2hhbm5lbC5zZW5kKHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgICB0bzogJ2N1cnJlbnQnLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChhcGk/LnNlbmQpIHtcbiAgICAgIGF3YWl0IGFwaS5zZW5kKGNvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnW0hlcm1pdENyYWJdIOa2iOaBrzonLCBjb250ZW50KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbSGVybWl0Q3JhYl0g5Y+R6YCB5raI5oGv5aSx6LSlOicsIGVycm9yLm1lc3NhZ2UpO1xuICB9XG59XG5cblxuLyoqXG4gKiBiZWZvcmVfdG9vbF9jYWxsIOmSqeWtkOWkhOeQhuWZqCAo5YW85a655pen55So5rOVKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gb25CZWZvcmVUb29sQ2FsbCh0b29sQ2FsbDogVG9vbENhbGwpOiBQcm9taXNlPHsgYmxvY2s6IGJvb2xlYW47IHJlYXNvbj86IHN0cmluZyB9PiB7XG4gIGlmICghaW50ZXJjZXB0b3IpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tIZXJtaXRDcmFiXSDmj5Lku7bmnKrliJ3lp4vljJbvvIzmlL7ooYzlt6XlhbfosIPnlKgnKTtcbiAgICByZXR1cm4geyBibG9jazogZmFsc2UgfTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IGludGVyY2VwdG9yLmludGVyY2VwdCh0b29sQ2FsbCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW0hlcm1pdENyYWJdIOaLpuaIquWZqOmUmeivrzonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgYmxvY2s6IGZhbHNlIH07XG4gIH1cbn1cblxuLyoqXG4gKiDojrflj5bmj5Lku7bphY3nva5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZygpOiBhbnkge1xuICAvLyDphY3nva7lnKggcmVnaXN0ZXIg5pe25bey5Lyg5YWl5oum5oiq5Zmo77yM5q2k5aSE6L+U5Zue56m65a+56LGhXG4gIHJldHVybiB7fTtcbn1cblxuLyoqXG4gKiDojrflj5blvoXlrqHmibnor7fmsYLliJfooahcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFBlbmRpbmdSZXF1ZXN0cygpOiBhbnlbXSB7XG4gIGlmICghaW50ZXJjZXB0b3IpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG4vKipcbiAqIOm7mOiupOWvvOWHuuaPkuS7tuWvueixoVxuICovXG5leHBvcnQgZGVmYXVsdCBwbHVnaW47XG4iXX0=