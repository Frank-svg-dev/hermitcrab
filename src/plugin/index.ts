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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Interceptor } from '../core/Interceptor';
import { ToolCall, InterceptorConfig, DEFAULT_CONFIG } from '../types';

let interceptor: Interceptor | null = null;

/**
 * OpenClaw 插件定义
 */
export const plugin = {
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
  register(api: any): void {
    console.log('[HermitCrab] 插件注册中...');
    
    // 直接读取 openclaw.json 获取配置
    const configPath = path.join(process.env.HOME || '/home/node', '.openclaw', 'openclaw.json');
    let pluginConfig: any = {};
    
    try {
      const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      pluginConfig = fullConfig.plugins?.entries?.['hermitcrab']?.config || {};
      console.log('[HermitCrab] 读取配置成功');
    } catch (e: any) {
      console.warn('[HermitCrab] 无法读取配置文件:', e.message);
      console.warn('[HermitCrab] 将使用默认配置');
    }
    
    console.log('[HermitCrab] 配置:', JSON.stringify(pluginConfig, null, 2));

    // 合并默认配置和用户配置
    const mergedConfig: InterceptorConfig = {
      ...DEFAULT_CONFIG,
      ...pluginConfig,
      llm: {
        ...DEFAULT_CONFIG.llm,
        ...pluginConfig?.llm,
      },
      profile: {
        ...DEFAULT_CONFIG.profile,
        ...pluginConfig?.profile,
      },
      riskThresholds: {
        ...DEFAULT_CONFIG.riskThresholds,
        ...pluginConfig?.riskThresholds,
      },
    };

    // 初始化拦截器 (传入配置)
    interceptor = new Interceptor(mergedConfig, pluginConfig?.llm);
    console.log('[HermitCrab] 拦截器初始化完成');
    console.log('[HermitCrab] LLM 配置:', pluginConfig?.llm?.model || '使用默认模型');

    // 注册 before_tool_call 钩子
    api.on('before_tool_call', async (event: any) => {
      const toolCall: ToolCall = {
        id: event.toolCallId || crypto.randomUUID(),
        module: event.toolName?.split('.')[0] || 'Unknown',
        method: event.toolName?.split('.')[1] || event.toolName || 'unknown',
        args: Array.isArray(event.params) ? event.params : [event.params || {}],
        timestamp: Date.now(),
      };

      console.log('[HermitCrab] 拦截工具调用:', toolCall.module, toolCall.method);

      try {
        const result = await interceptor!.intercept(toolCall);
        
        // 如果需要阻止工具调用
        if (result.block) {
          // 检查 event 是否支持 preventDefault
          if (typeof event.preventDefault === 'function') {
            event.preventDefault();
            event.blockReason = result.reason || 'BLOCKED_BY_LLM_CLAWBANDS';
          }
          console.log('[HermitCrab] 已阻止:', result.reason);
          return { block: true, blockReason: result.message };
        }else if (result.block == undefined) {
          return { block: true, message: result.message };
        }
        return { block: false, message: result.message };

      } catch (error) {
        console.error('[HermitCrab] 拦截器错误:', error);
        return { block: true, message: "INTERCEPTOR_ERROR, 需要人工确认" };
      }
    });


    api.on('message_received', async (event: any) => {
      const message = event.content || event.text || event.message || '';
      if (message) {
        await handleUserMessage(api, message);
      }
    });

    console.log('[HermitCrab] 插件注册完成');
  },

  /**
   * 插件卸载
   */
  unregister(): void {
    console.log('[HermitCrab] 插件卸载中...');
    interceptor = null;
    console.log('[HermitCrab] 插件已卸载');
  },
};

/**
 * 初始化插件 (兼容旧用法)
 */
export async function init(config?: any): Promise<void> {
  console.log('[HermitCrab] 插件初始化...');
  interceptor = new Interceptor(DEFAULT_CONFIG, config?.llm);
  console.log('[HermitCrab] 插件初始化完成');
}


async function handleUserMessage(api: any, message: string) {
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
  } else {
    console.log('[HermitCrab] 校验失败:', result?.reason);
    return { block: true, blockReason: '校验失败，需要重新输入正确的口令' };
  }
}



async function sendMessage(api: any, content: string) {
  try {
    // 尝试使用 channel API
    if (api?.channel?.send) {
      await api.channel.send({
        type: 'text',
        content: content,
        to: 'current',
      });
    } else if (api?.send) {
      await api.send(content);
    } else {
      console.log('[HermitCrab] 消息:', content);
    }
  } catch (error: any) {
    console.error('[HermitCrab] 发送消息失败:', error.message);
  }
}


/**
 * before_tool_call 钩子处理器 (兼容旧用法)
 */
export async function onBeforeToolCall(toolCall: ToolCall): Promise<{ block: boolean; reason?: string }> {
  if (!interceptor) {
    console.warn('[HermitCrab] 插件未初始化，放行工具调用');
    return { block: false };
  }

  try {
    return await interceptor.intercept(toolCall);
  } catch (error) {
    console.error('[HermitCrab] 拦截器错误:', error);
    return { block: false };
  }
}

/**
 * 获取插件配置
 */
export function getConfig(): any {
  // 配置在 register 时已传入拦截器，此处返回空对象
  return {};
}

/**
 * 获取待审批请求列表
 */
export function getPendingRequests(): any[] {
  if (!interceptor) {
    return [];
  }
  return [];
}

/**
 * 默认导出插件对象
 */
export default plugin;
