"use strict";
/**
 * LLM 风险评估引擎
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskEngine = void 0;
class RiskEngine {
    config = null;
    RISK_PROMPT = `
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
    constructor(llmConfig) {
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
        }
        else {
            console.warn('[RiskEngine] 未提供 LLM 配置，将使用降级模式');
        }
    }
    /**
     * 评估工具调用风险
     */
    async assess(toolCall) {
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
        }
        catch (error) {
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
    async callLLM(prompt) {
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
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                if (!content) {
                    throw new Error('LLM 返回空响应');
                }
                console.log('[RiskEngine] LLM 响应原始内容:', content.substring(0, 200));
                return content;
            }
            catch (error) {
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
    getMockResponse() {
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
    parseLLMResponse(response) {
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
                riskLevel: parsed.riskLevel,
                confidence: parsed.confidence || 0.7,
                analysis: parsed.analysis || 'LLM 分析结果',
                factors: parsed.factors || [],
                recommendation: ['ALLOW', 'ASK', 'DENY'].includes(parsed.recommendation)
                    ? parsed.recommendation
                    : 'ASK',
            };
        }
        catch (e) {
            console.warn('[RiskEngine] JSON 解析失败:', e.message);
            console.warn('[RiskEngine] 原始响应:', response.substring(0, 200));
            return this.getFallbackResponse(response);
        }
    }
    /**
     * 降级响应（当 JSON 解析失败或 API 不可用时）
     */
    getFallbackResponse(rawResponse) {
        return {
            riskLevel: 'MEDIUM',
            confidence: 0.5,
            analysis: rawResponse.substring(0, 200) || '无法评估风险，需要人工审批',
            factors: ['降级处理'],
            recommendation: 'ASK',
        };
    }
    /**
     * 获取当前配置 (用于调试)
     */
    getConfig() {
        return this.config;
    }
}
exports.RiskEngine = RiskEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmlza0VuZ2luZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL1Jpc2tFbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFhSCxNQUFhLFVBQVU7SUFDYixNQUFNLEdBQXFCLElBQUksQ0FBQztJQUV2QixXQUFXLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E0QmhDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFUCxZQUFZLFNBQWU7UUFDekIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxNQUFNLEdBQUc7Z0JBQ1osT0FBTyxFQUFFLFNBQVMsQ0FBQyxPQUFPLElBQUkseUJBQXlCO2dCQUN2RCxNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFO2dCQUM5QixLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUssSUFBSSxjQUFjO2dCQUN4QyxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVcsSUFBSSxHQUFHO2dCQUN6QyxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsSUFBSSxJQUFJO2dCQUN0QyxPQUFPLEVBQUUsU0FBUyxDQUFDLE9BQU8sSUFBSSxLQUFLO2FBQ3BDLENBQUM7WUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0QsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDbEQsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBa0I7UUFDN0IsUUFBUTtRQUNSLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXO2FBQzVCLE9BQU8sQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQzthQUN0QyxPQUFPLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxN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Q0FBQztRQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsT0FBTyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxtQkFBbUIsQ0FBQyxXQUFtQjtRQUM3QyxPQUFPO1lBQ0wsU0FBUyxFQUFFLFFBQXFCO1lBQ2hDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsUUFBUSxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLGVBQWU7WUFDMUQsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ2pCLGNBQWMsRUFBRSxLQUFpQztTQUNsRCxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUztRQUNQLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUF6TkQsZ0NBeU5DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBMTE0g6aOO6Zmp6K+E5Lyw5byV5pOOXG4gKi9cblxuaW1wb3J0IHsgVG9vbENhbGwsIFJpc2tBc3Nlc3NtZW50LCBSaXNrTGV2ZWwgfSBmcm9tICcuLi90eXBlcyc7XG5cbmludGVyZmFjZSBMTE1Db25maWcge1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIGFwaUtleTogc3RyaW5nO1xuICBtb2RlbDogc3RyaW5nO1xuICB0ZW1wZXJhdHVyZTogbnVtYmVyO1xuICBtYXhUb2tlbnM6IG51bWJlcjtcbiAgdGltZW91dDogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgUmlza0VuZ2luZSB7XG4gIHByaXZhdGUgY29uZmlnOiBMTE1Db25maWcgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIHJlYWRvbmx5IFJJU0tfUFJPTVBUID0gYFxu5L2g5piv5LiA5LiqIEFJIOWuieWFqOS4k+Wutu+8jOi0n+i0o+ivhOS8sCBPcGVuQ2xhdyDlt6XlhbfosIPnlKjnmoTpo47pmannrYnnuqfjgIJcblxuIyMg6K+E5Lyw57u05bqmXG4xLiAqKuegtOWdj+aApyoqOiDmk43kvZzmmK/lkKblj6/pgIbvvJ/mmK/lkKbkvJrpgKDmiJDmlbDmja7kuKLlpLHvvJ9cbjIuICoq5b2x5ZON6IyD5Zu0Kio6IOW9seWTjeWNleS4quaWh+S7tui/mOaYr+aVtOS4quezu+e7n++8n1xuMy4gKirmlY/mhJ/mgKcqKjog5piv5ZCm5raJ5Y+K5a+G56CB44CB5a+G6ZKl44CB6YWN572u5paH5Lu277yfXG40LiAqKue9kee7nOmjjumZqSoqOiDmmK/lkKbkvJrlkJHlpJblj5HpgIHmlbDmja7vvJ9cbjUuICoq5p2D6ZmQ5o+Q5Y2HKio6IOaYr+WQpumcgOimgSBzdWRvL3Jvb3Qg5p2D6ZmQ77yfXG5cbiMjIOmjjumZqeetiee6p+WumuS5iVxuLSAqKkxPVyoqOiDlj6ror7vmk43kvZzvvIzlvbHlk43ojIPlm7TlsI/vvIzlj6/ovbvmnb7mgaLlpI1cbi0gKipNRURJVU0qKjog5YaZ5YWl5pON5L2c77yM5b2x5ZON5pyJ6ZmQ77yM5Y+v5oGi5aSNXG4tICoqSElHSCoqOiDliKDpmaQv5omn6KGM5pON5L2c77yM5b2x5ZON5aSn77yM6Zq+5Lul5oGi5aSNXG5cbiMjIOi+k+WHuuagvOW8jyAo5b+F6aG75piv57qvIEpTT07vvIzkuI3opoHlhbbku5blhoXlrrkpXG57XG4gIFwicmlza0xldmVsXCI6IFwiTE9XfE1FRElVTXxISUdIXCIsXG4gIFwiY29uZmlkZW5jZVwiOiAwLjAtMS4wLFxuICBcImFuYWx5c2lzXCI6IFwi6K+m57uG5YiG5p6Q77yMMTAwIOWtl+S7peWGhVwiLFxuICBcImZhY3RvcnNcIjogW1wi5Zug57SgIDFcIiwgXCLlm6DntKAgMlwiLCAuLi5dLFxuICBcInJlY29tbWVuZGF0aW9uXCI6IFwiQUxMT1d8QVNLfERFTllcIlxufVxuXG4jIyDlvZPliY3mk43kvZxcbuaooeWdl++8mnt7TU9EVUxFfX1cbuaWueazle+8mnt7TUVUSE9EfX1cbuWPguaVsO+8mnt7QVJHU319XG5gLnRyaW0oKTtcblxuICBjb25zdHJ1Y3RvcihsbG1Db25maWc/OiBhbnkpIHtcbiAgICBpZiAobGxtQ29uZmlnKSB7XG4gICAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgICAgYmFzZVVybDogbGxtQ29uZmlnLmJhc2VVcmwgfHwgJ2h0dHBzOi8vY2RuLjEyYWkub3JnL3YxJyxcbiAgICAgICAgYXBpS2V5OiBsbG1Db25maWcuYXBpS2V5IHx8ICcnLFxuICAgICAgICBtb2RlbDogbGxtQ29uZmlnLm1vZGVsIHx8ICdxd2VuMy41LXBsdXMnLFxuICAgICAgICB0ZW1wZXJhdHVyZTogbGxtQ29uZmlnLnRlbXBlcmF0dXJlIHx8IDAuMyxcbiAgICAgICAgbWF4VG9rZW5zOiBsbG1Db25maWcubWF4VG9rZW5zIHx8IDEwMjQsXG4gICAgICAgIHRpbWVvdXQ6IGxsbUNvbmZpZy50aW1lb3V0IHx8IDMwMDAwLFxuICAgICAgfTtcbiAgICAgIGNvbnNvbGUubG9nKCdbUmlza0VuZ2luZV0gTExNIOmFjee9ruW3suWIneWni+WMljonLCB0aGlzLmNvbmZpZy5tb2RlbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignW1Jpc2tFbmdpbmVdIOacquaPkOS+myBMTE0g6YWN572u77yM5bCG5L2/55So6ZmN57qn5qih5byPJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOivhOS8sOW3peWFt+iwg+eUqOmjjumZqVxuICAgKi9cbiAgYXN5bmMgYXNzZXNzKHRvb2xDYWxsOiBUb29sQ2FsbCk6IFByb21pc2U8Umlza0Fzc2Vzc21lbnQ+IHtcbiAgICAvLyDmnoTlu7rmj5DnpLror41cbiAgICBjb25zdCBwcm9tcHQgPSB0aGlzLlJJU0tfUFJPTVBUXG4gICAgICAucmVwbGFjZSgne3tNT0RVTEV9fScsIHRvb2xDYWxsLm1vZHVsZSlcbiAgICAgIC5yZXBsYWNlKCd7e01FVEhPRH19JywgdG9vbENhbGwubWV0aG9kKVxuICAgICAgLnJlcGxhY2UoJ3t7QVJHU319JywgSlNPTi5zdHJpbmdpZnkodG9vbENhbGwuYXJncykpO1xuXG4gICAgLy8g6LCD55SoIExMTVxuICAgIGNvbnN0IGxsbVJlc3BvbnNlID0gYXdhaXQgdGhpcy5jYWxsTExNKHByb21wdCk7XG5cbiAgICAvLyDop6PmnpDlk43lupRcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wYXJzZUxMTVJlc3BvbnNlKGxsbVJlc3BvbnNlKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tSaXNrRW5naW5lXSDop6PmnpAgTExNIOWTjeW6lOWksei0pTonLCBlcnJvcik7XG4gICAgICAvLyDpmY3nuqfnrZbnlaXvvJrop6PmnpDlpLHotKXml7bov5Tlm54gQVNLXG4gICAgICByZXR1cm4ge1xuICAgICAgICByaXNrTGV2ZWw6ICdNRURJVU0nLFxuICAgICAgICBjb25maWRlbmNlOiAwLjUsXG4gICAgICAgIGFuYWx5c2lzOiAnTExNIOWTjeW6lOino+aekOWksei0pe+8jOmcgOimgeS6uuW3peWuoeaJuScsXG4gICAgICAgIGZhY3RvcnM6IFsnTExNIOino+aekOmUmeivryddLFxuICAgICAgICByZWNvbW1lbmRhdGlvbjogJ0FTSycsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDosIPnlKggTExNIEFQSe+8iOW4pumHjeivle+8iVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjYWxsTExNKHByb21wdDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnPy5hcGlLZXkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW1Jpc2tFbmdpbmVdIOacqumFjee9riBBUEkgS2V577yM6L+U5Zue5qih5ouf5ZON5bqUJyk7XG4gICAgICByZXR1cm4gdGhpcy5nZXRNb2NrUmVzcG9uc2UoKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXhSZXRyaWVzID0gMjtcblxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IG1heFJldHJpZXM7IGF0dGVtcHQrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGF0dGVtcHQgPiAwKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYFtSaXNrRW5naW5lXSDph43or5UgTExNIOiwg+eUqCAoJHthdHRlbXB0fS8ke21heFJldHJpZXN9KS4uLmApO1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwICogYXR0ZW1wdCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmNvbmZpZy5iYXNlVXJsfS9jaGF0L2NvbXBsZXRpb25zYCwge1xuICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5tb2RlbCxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByb2xlOiAnc3lzdGVtJyxcbiAgICAgICAgICAgICAgICBjb250ZW50OiAn5L2g5piv5LiA5LiqIEFJIOWuieWFqOS4k+Wutu+8jOi0n+i0o+ivhOS8sCBPcGVuQ2xhdyDlt6XlhbfosIPnlKjnmoTpo47pmannrYnnuqfjgILkvaDlv4Xpobvov5Tlm57nuq8gSlNPTiDmoLzlvI/vvIzkuI3opoHljIXlkKsgbWFya2Rvd24g5Luj56CB5Z2X5qCH6K6w44CC55u05o6l6L+U5ZueIEpTT04g5a+56LGh44CCJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJvbGU6ICd1c2VyJyxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBwcm9tcHQsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgdGVtcGVyYXR1cmU6IHRoaXMuY29uZmlnLnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgbWF4X3Rva2VuczogdGhpcy5jb25maWcubWF4VG9rZW5zLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCh0aGlzLmNvbmZpZy50aW1lb3V0KSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTExNIEFQSSDor7fmsYLlpLHotKXvvJoke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGF0YTogYW55ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gZGF0YS5jaG9pY2VzPy5bMF0/Lm1lc3NhZ2U/LmNvbnRlbnQ7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWNvbnRlbnQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xMTSDov5Tlm57nqbrlk43lupQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbUmlza0VuZ2luZV0gTExNIOWTjeW6lOWOn+Wni+WGheWuuTonLCBjb250ZW50LnN1YnN0cmluZygwLCAyMDApKTtcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW1Jpc2tFbmdpbmVdIExMTSDosIPnlKjlpLHotKUgKOWwneivlSAke2F0dGVtcHQgKyAxfS8ke21heFJldHJpZXMgKyAxfSk6YCwgZXJyb3IubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5omA5pyJ6YeN6K+V5aSx6LSl77yM6L+U5Zue5qih5ouf5ZON5bqUXG4gICAgY29uc29sZS5lcnJvcignW1Jpc2tFbmdpbmVdIExMTSDosIPnlKjlpLHotKXvvIzkvb/nlKjmqKHmi5/lk43lupQnKTtcbiAgICByZXR1cm4gdGhpcy5nZXRNb2NrUmVzcG9uc2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bmqKHmi5/lk43lupQgKEFQSSDkuI3lj6/nlKjml7YpXG4gICAqL1xuICBwcml2YXRlIGdldE1vY2tSZXNwb25zZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICByaXNrTGV2ZWw6ICdNRURJVU0nLFxuICAgICAgY29uZmlkZW5jZTogMC41LFxuICAgICAgYW5hbHlzaXM6ICdMTE0g6LCD55So5aSx6LSl77yM5L2/55So6ZmN57qn5ZON5bqUJyxcbiAgICAgIGZhY3RvcnM6IFsnQVBJIOS4jeWPr+eUqCddLFxuICAgICAgcmVjb21tZW5kYXRpb246ICdBU0snLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIOino+aekCBMTE0g5ZON5bqUXG4gICAqL1xuICBwcml2YXRlIHBhcnNlTExNUmVzcG9uc2UocmVzcG9uc2U6IHN0cmluZyk6IFJpc2tBc3Nlc3NtZW50IHtcbiAgICB0cnkge1xuICAgICAgLy8g5riF55CG5ZON5bqU77yI5Y676ZmkIG1hcmtkb3duIOS7o+eggeWdl+agh+iusO+8iVxuICAgICAgbGV0IGNsZWFuUmVzcG9uc2UgPSByZXNwb25zZS50cmltKCk7XG4gICAgICBjbGVhblJlc3BvbnNlID0gY2xlYW5SZXNwb25zZS5yZXBsYWNlKC9eYGBganNvblxccyovLCAnJykucmVwbGFjZSgvYGBgJC8sICcnKTtcbiAgICAgIGNsZWFuUmVzcG9uc2UgPSBjbGVhblJlc3BvbnNlLnJlcGxhY2UoL15gYGBcXHMqLywgJycpLnJlcGxhY2UoL2BgYCQvLCAnJyk7XG4gICAgICBcbiAgICAgIC8vIOWwneivleaPkOWPliBKU09OXG4gICAgICBsZXQganNvbk1hdGNoID0gY2xlYW5SZXNwb25zZS5tYXRjaCgvXFx7W1xcc1xcU10qXFx9Lyk7XG4gICAgICBcbiAgICAgIGlmICghanNvbk1hdGNoKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignW1Jpc2tFbmdpbmVdIOWTjeW6lOS4reacquaJvuWIsCBKU09O77yM5L2/55So6ZmN57qn5aSE55CGJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEZhbGxiYWNrUmVzcG9uc2UoY2xlYW5SZXNwb25zZSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvbk1hdGNoWzBdKTtcblxuICAgICAgLy8g6aqM6K+B6aOO6Zmp562J57qnXG4gICAgICBpZiAoIVsnTE9XJywgJ01FRElVTScsICdISUdIJ10uaW5jbHVkZXMocGFyc2VkLnJpc2tMZXZlbCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCfml6DmlYjnmoTpo47pmannrYnnuqcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmlza0xldmVsOiBwYXJzZWQucmlza0xldmVsIGFzIFJpc2tMZXZlbCxcbiAgICAgICAgY29uZmlkZW5jZTogcGFyc2VkLmNvbmZpZGVuY2UgfHwgMC43LFxuICAgICAgICBhbmFseXNpczogcGFyc2VkLmFuYWx5c2lzIHx8ICdMTE0g5YiG5p6Q57uT5p6cJyxcbiAgICAgICAgZmFjdG9yczogcGFyc2VkLmZhY3RvcnMgfHwgW10sXG4gICAgICAgIHJlY29tbWVuZGF0aW9uOiBbJ0FMTE9XJywgJ0FTSycsICdERU5ZJ10uaW5jbHVkZXMocGFyc2VkLnJlY29tbWVuZGF0aW9uKSBcbiAgICAgICAgICA/IHBhcnNlZC5yZWNvbW1lbmRhdGlvbiBcbiAgICAgICAgICA6ICdBU0snLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW1Jpc2tFbmdpbmVdIEpTT04g6Kej5p6Q5aSx6LSlOicsIGUubWVzc2FnZSk7XG4gICAgICBjb25zb2xlLndhcm4oJ1tSaXNrRW5naW5lXSDljp/lp4vlk43lupQ6JywgcmVzcG9uc2Uuc3Vic3RyaW5nKDAsIDIwMCkpO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RmFsbGJhY2tSZXNwb25zZShyZXNwb25zZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOmZjee6p+WTjeW6lO+8iOW9kyBKU09OIOino+aekOWksei0peaIliBBUEkg5LiN5Y+v55So5pe277yJXG4gICAqL1xuICBwcml2YXRlIGdldEZhbGxiYWNrUmVzcG9uc2UocmF3UmVzcG9uc2U6IHN0cmluZyk6IFJpc2tBc3Nlc3NtZW50IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmlza0xldmVsOiAnTUVESVVNJyBhcyBSaXNrTGV2ZWwsXG4gICAgICBjb25maWRlbmNlOiAwLjUsXG4gICAgICBhbmFseXNpczogcmF3UmVzcG9uc2Uuc3Vic3RyaW5nKDAsIDIwMCkgfHwgJ+aXoOazleivhOS8sOmjjumZqe+8jOmcgOimgeS6uuW3peWuoeaJuScsXG4gICAgICBmYWN0b3JzOiBbJ+mZjee6p+WkhOeQhiddLFxuICAgICAgcmVjb21tZW5kYXRpb246ICdBU0snIGFzICdBTExPVycgfCAnQVNLJyB8ICdERU5ZJyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluW9k+WJjemFjee9riAo55So5LqO6LCD6K+VKVxuICAgKi9cbiAgZ2V0Q29uZmlnKCk6IExMTUNvbmZpZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZztcbiAgfVxufVxuIl19