/**
 * 令牌验证模块 - 简化版
 * 直接从 openclaw.json 配置读取令牌比对
 */

import * as fs from 'fs';
import * as path from 'path';

export class TokenValidator {
  private configPath: string;
  private tokenSecrets: string[] = [];

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(
      process.env.HOME || '/home/node', 
      '.openclaw', 
      'openclaw.json'
    );
    this.loadTokenSecrets();
  }

  /**
   * 从配置加载令牌密钥列表
   */
  private loadTokenSecrets(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        const secrets = config.plugins?.entries?.['llm-clawbands']?.config?.token?.secrets;
        
        if (Array.isArray(secrets)) {
          this.tokenSecrets = secrets;
        } else if (typeof secrets === 'string') {
          this.tokenSecrets = [secrets];
        } else {
          // 兼容旧的 secret 字段
          const secret = config.plugins?.entries?.['llm-clawbands']?.config?.token?.secret;
          if (secret) {
            this.tokenSecrets = [secret];
          }
        }
        
        console.log(`[TokenValidator] 已加载 ${this.tokenSecrets.length} 个令牌密钥`);
      }
    } catch (error: any) {
      console.error('[TokenValidator] 加载令牌配置失败:', error.message);
      this.tokenSecrets = [];
    }
  }

  /**
   * 验证令牌
   */
  async verify(token: string): Promise<{ valid: boolean; userId?: string }> {
    if (this.tokenSecrets.length === 0) {
      console.warn('[TokenValidator] 未配置任何令牌密钥');
      return { valid: false, userId: 'unauthorized' };
    }

    // 遍历所有配置的令牌，匹配任意一个即可
    for (const secret of this.tokenSecrets) {
      if (token === secret) {
        return { valid: true, userId: secret };
      }
    }

    console.log('[TokenValidator] 令牌验证失败');
    return { valid: false, userId: 'unauthorized' };
  }

  /**
   * 重新加载配置（可选）
   */
  reload(): void {
    this.loadTokenSecrets();
  }
}