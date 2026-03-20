/**
 * Memory 存储模块
 * 用于存储用户画像和学习数据
 */

import * as fs from 'fs';
import * as path from 'path';

export class MemoryStore {
  private readonly memoryPath: string;

  constructor(memoryPath?: string) {
    this.memoryPath = memoryPath || path.join(process.env.HOME || '~', '.openclaw', 'llm-clawbands', 'memory.jsonl');
  }

  /**
   * 写入记忆
   */
  async write(type: string, data: any): Promise<void> {
    try {
      const dir = path.dirname(this.memoryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const entry = {
        timestamp: new Date().toISOString(),
        type,
        data,
      };

      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.memoryPath, line, { mode: 0o600 });
    } catch (error) {
      console.error('[MemoryStore] 写入记忆失败:', error);
      throw error;
    }
  }

  /**
   * 读取记忆 (按类型)
   */
  read(type: string, limit: number = 100): any[] {
    try {
      if (!fs.existsSync(this.memoryPath)) {
        return [];
      }

      const content = fs.readFileSync(this.memoryPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      return lines
        .map(line => JSON.parse(line))
        .filter(entry => entry.type === type)
        .slice(-limit)
        .map(entry => entry.data);
    } catch (error) {
      console.error('[MemoryStore] 读取记忆失败:', error);
      return [];
    }
  }

  /**
   * 搜索记忆
   */
  search(query: string, limit: number = 20): any[] {
    try {
      if (!fs.existsSync(this.memoryPath)) {
        return [];
      }

      const content = fs.readFileSync(this.memoryPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const queryLower = query.toLowerCase();
      
      return lines
        .map(line => JSON.parse(line))
        .filter(entry => 
          JSON.stringify(entry).toLowerCase().includes(queryLower)
        )
        .slice(-limit)
        .map(entry => entry.data);
    } catch (error) {
      console.error('[MemoryStore] 搜索记忆失败:', error);
      return [];
    }
  }

  /**
   * 清除记忆
   */
  clear(): void {
    try {
      if (fs.existsSync(this.memoryPath)) {
        fs.writeFileSync(this.memoryPath, '', { mode: 0o600 });
      }
    } catch (error) {
      console.error('[MemoryStore] 清除记忆失败:', error);
      throw error;
    }
  }
}
