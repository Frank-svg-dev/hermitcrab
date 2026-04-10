/**
 * 审计日志模块
 * JSON Lines 格式，只追加不可篡改
 */
import { AuditLogEntry } from '../types';
export declare class AuditLog {
    private readonly logPath;
    constructor(logPath?: string);
    /**
     * 追加日志条目
     */
    append(entry: AuditLogEntry): Promise<void>;
    /**
     * 查询日志 (最近 N 条)
     */
    query(limit?: number): AuditLogEntry[];
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
    }): AuditLogEntry[];
    /**
     * 获取统计信息
     */
    getStats(): {
        totalCalls: number;
        decisions: Record<string, number>;
        avgDecisionTime: number;
    };
}
