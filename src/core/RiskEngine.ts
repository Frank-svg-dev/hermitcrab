/**
 * LLM 风险评估引擎
 */

import { ToolCall, RiskAssessment, RiskLevel } from '../types';

interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export class RiskEngine {
  private config: LLMConfig | null = null;

  private readonly RISK_PROMPT = `
你是一个 AI 安全专家，负责评估 OpenClaw 工具调用的风险等级。

## 评估维度
1. **破坏性**: 操作是否可逆？是否会造成数据丢失？
2. **影响范围**: 影响单个文件还是整个系统？
3. **敏感性**: 是否涉及密码、密钥、配置文件？
4. **网络风险**: 是否会向外发送数据？
5. **权限提升**: 是否需要 sudo/root 权限？

## 风险等级定义
- **LOW**: 只读操作，影响范围小，可轻松恢复
- **MEDIUM**: 写入操作，影响有限，可恢复
- **HIGH**: 删除/执行操作，影响大，难以恢复

## 输出格式 (必须是纯 JSON，不要其他内容)
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "confidence": 0.0-1.0,
  "analysis": "详细分析，100 字以内",
  "factors": ["因素 1", "因素 2", ...],
  "recommendation": "ALLOW|ASK|DENY"
}

## 当前操作
模块：{{MODULE}}
方法：{{METHOD}}
参数：{{ARGS}}
`.trim();

  constructor(llmConfig?: any) {
    if (llmConfig) {
      this.config = {
        baseUrl: llmConfig.baseUrl || 'https://cdn.12ai.org/v1',
        apiKey: llmConfig.apiKey || '',
        model: llmConfig.model || 'qwen3.5-plus',
        temperature: llmConfig.temperature || 0.3,
        maxTokens: llmConfig.maxTokens || 1024,
        timeout: llmConfig.timeout || 30000,
      };
      console.log('[RiskEngine] LLM 配置已初始化:', this.config.model);
    } else {
      console.warn('[RiskEngine] 未提供 LLM 配置，将使用降级模式');
    }
  }

  /**
   * 评估工具调用风险
   */
  async assess(toolCall: ToolCall): Promise<RiskAssessment> {
    // 构建提示词
    const prompt = this.RISK_PROMPT
      .replace('{{MODULE}}', toolCall.module)
      .replace('{{METHOD}}', toolCall.method)
      .replace('{{ARGS}}', JSON.stringify(toolCall.args));

    // 调用 LLM
    const llmResponse = await this.callLLM(prompt);

    // 解析响应
    try {
      const result = this.parseLLMResponse(llmResponse);
      return result;
    } catch (error) {
      console.error('[RiskEngine] 解析 LLM 响应失败:', error);
      // 降级策略：解析失败时返回 ASK
      return {
        riskLevel: 'MEDIUM',
        confidence: 0.5,
        analysis: 'LLM 响应解析失败，需要人工审批',
        factors: ['LLM 解析错误'],
        recommendation: 'ASK',
      };
    }
  }

  /**
   * 调用 LLM API（带重试）
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.config?.apiKey) {
      console.warn('[RiskEngine] 未配置 API Key，返回模拟响应');
      return this.getMockResponse();
    }

    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[RiskEngine] 重试 LLM 调用 (${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              {
                role: 'system',
                content: '你是一个 AI 安全专家，负责评估 OpenClaw 工具调用的风险等级。你必须返回纯 JSON 格式，不要包含 markdown 代码块标记。直接返回 JSON 对象。',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`LLM API 请求失败：${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error('LLM 返回空响应');
        }

        console.log('[RiskEngine] LLM 响应原始内容:', content.substring(0, 200));
        return content;
      } catch (error: any) {
        console.warn(`[RiskEngine] LLM 调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error.message);
      }
    }

    // 所有重试失败，返回模拟响应
    console.error('[RiskEngine] LLM 调用失败，使用模拟响应');
    return this.getMockResponse();
  }

  /**
   * 获取模拟响应 (API 不可用时)
   */
  private getMockResponse(): string {
    return JSON.stringify({
      riskLevel: 'MEDIUM',
      confidence: 0.5,
      analysis: 'LLM 调用失败，使用降级响应',
      factors: ['API 不可用'],
      recommendation: 'ASK',
    });
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(response: string): RiskAssessment {
    try {
      // 清理响应（去除 markdown 代码块标记）
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```$/, '');
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```$/, '');
      
      // 尝试提取 JSON
      let jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.warn('[RiskEngine] 响应中未找到 JSON，使用降级处理');
        return this.getFallbackResponse(cleanResponse);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 验证风险等级
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(parsed.riskLevel)) {
        throw new Error('无效的风险等级');
      }

      return {
        riskLevel: parsed.riskLevel as RiskLevel,
        confidence: parsed.confidence || 0.7,
        analysis: parsed.analysis || 'LLM 分析结果',
        factors: parsed.factors || [],
        recommendation: ['ALLOW', 'ASK', 'DENY'].includes(parsed.recommendation) 
          ? parsed.recommendation 
          : 'ASK',
      };
    } catch (e: any) {
      console.warn('[RiskEngine] JSON 解析失败:', e.message);
      console.warn('[RiskEngine] 原始响应:', response.substring(0, 200));
      return this.getFallbackResponse(response);
    }
  }

  /**
   * 降级响应（当 JSON 解析失败或 API 不可用时）
   */
  private getFallbackResponse(rawResponse: string): RiskAssessment {
    return {
      riskLevel: 'MEDIUM' as RiskLevel,
      confidence: 0.5,
      analysis: rawResponse.substring(0, 200) || '无法评估风险，需要人工审批',
      factors: ['降级处理'],
      recommendation: 'ASK' as 'ALLOW' | 'ASK' | 'DENY',
    };
  }

  /**
   * 获取当前配置 (用于调试)
   */
  getConfig(): LLMConfig | null {
    return this.config;
  }
}
