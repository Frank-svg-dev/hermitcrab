/**
 * 审计日志模块
 * JSON Lines 格式，只追加不可篡改
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditLogEntry } from '../types';

export class AuditLog {
  private readonly logPath: string;

  constructor(logPath?: string) {
    this.logPath = logPath || path.join(process.env.HOME || '~', '.openclaw', 'llm-clawbands', 'audit.jsonl');
  }

  /**
   * 追加日志条目
   */
  async append(entry: AuditLogEntry): Promise<void> {
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logPath, line, { mode: 0o600 });
    } catch (error) {
      console.error('[AuditLog] 写入日志失败:', error);
      throw error;
    }
  }

  /**
   * 查询日志 (最近 N 条)
   */
  query(limit: number = 50): AuditLogEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      return lines
        .slice(-limit)
        .reverse()
        .map(line => JSON.parse(line) as AuditLogEntry);
    } catch (error) {
      console.error('[AuditLog] 查询日志失败:', error);
      return [];
    }
  }

  /**
   * 按条件过滤日志
   */
  filter(options: {
    module?: string;
    method?: string;
    decision?: string;
    source?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLogEntry[] {
    try {
      const allLogs = this.query(10000); // 最多查 10000 条

      return allLogs.filter(entry => {
        if (options.module && entry.module !== options.module) return false;
        if (options.method && entry.method !== options.method) return false;
        if (options.decision && entry.decision !== options.decision) return false;
        if (options.source && entry.source !== options.source) return false;
        if (options.userId && entry.userId !== options.userId) return false;
        if (options.startDate && entry.timestamp < options.startDate) return false;
        if (options.endDate && entry.timestamp > options.endDate) return false;
        return true;
      });
    } catch (error) {
      console.error('[AuditLog] 过滤日志失败:', error);
      return [];
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalCalls: number;
    decisions: Record<string, number>;
    avgDecisionTime: number;
  } {
    try {
      const logs = this.query(10000);
      
      const decisions: Record<string, number> = {};
      let totalDecisionTime = 0;
      let decisionCount = 0;

      for (const log of logs) {
        decisions[log.decision] = (decisions[log.decision] || 0) + 1;
      }

      return {
        totalCalls: logs.length,
        decisions,
        avgDecisionTime: decisionCount > 0 ? totalDecisionTime / decisionCount : 0,
      };
    } catch (error) {
      console.error('[AuditLog] 获取统计失败:', error);
      return { totalCalls: 0, decisions: {}, avgDecisionTime: 0 };
    }
  }
}
