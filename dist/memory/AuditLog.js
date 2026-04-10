"use strict";
/**
 * 审计日志模块
 * JSON Lines 格式，只追加不可篡改
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
exports.AuditLog = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AuditLog {
    logPath;
    constructor(logPath) {
        this.logPath = logPath || path.join(process.env.HOME || '~', '.openclaw', 'hermitcrab', 'audit.jsonl');
    }
    /**
     * 追加日志条目
     */
    async append(entry) {
        try {
            const dir = path.dirname(this.logPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logPath, line, { mode: 0o600 });
        }
        catch (error) {
            console.error('[AuditLog] 写入日志失败:', error);
            throw error;
        }
    }
    /**
     * 查询日志 (最近 N 条)
     */
    query(limit = 50) {
        try {
            if (!fs.existsSync(this.logPath)) {
                return [];
            }
            const content = fs.readFileSync(this.logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            return lines
                .slice(-limit)
                .reverse()
                .map(line => JSON.parse(line));
        }
        catch (error) {
            console.error('[AuditLog] 查询日志失败:', error);
            return [];
        }
    }
    /**
     * 按条件过滤日志
     */
    filter(options) {
        try {
            const allLogs = this.query(10000); // 最多查 10000 条
            return allLogs.filter(entry => {
                if (options.module && entry.module !== options.module)
                    return false;
                if (options.method && entry.method !== options.method)
                    return false;
                if (options.decision && entry.decision !== options.decision)
                    return false;
                if (options.source && entry.source !== options.source)
                    return false;
                if (options.userId && entry.userId !== options.userId)
                    return false;
                if (options.startDate && entry.timestamp < options.startDate)
                    return false;
                if (options.endDate && entry.timestamp > options.endDate)
                    return false;
                return true;
            });
        }
        catch (error) {
            console.error('[AuditLog] 过滤日志失败:', error);
            return [];
        }
    }
    /**
     * 获取统计信息
     */
    getStats() {
        try {
            const logs = this.query(10000);
            const decisions = {};
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
        }
        catch (error) {
            console.error('[AuditLog] 获取统计失败:', error);
            return { totalCalls: 0, decisions: {}, avgDecisionTime: 0 };
        }
    }
}
exports.AuditLog = AuditLog;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXVkaXRMb2cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWVtb3J5L0F1ZGl0TG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUc3QixNQUFhLFFBQVE7SUFDRixPQUFPLENBQVM7SUFFakMsWUFBWSxPQUFnQjtRQUMxQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3pHLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBb0I7UUFDL0IsSUFBSSxDQUFDO1lBQ0gsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDMUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzQyxNQUFNLEtBQUssQ0FBQztRQUNk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SSxFQUFFLENBQUM7Z0JBQ3ZCLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvRCxDQUFDO1lBRUQsT0FBTztnQkFDTCxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ3ZCLFNBQVM7Z0JBQ1QsZUFBZSxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMzRSxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzlELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUEzR0QsNEJBMkdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlrqHorqHml6Xlv5fmqKHlnZdcbiAqIEpTT04gTGluZXMg5qC85byP77yM5Y+q6L+95Yqg5LiN5Y+v56+h5pS5XG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEF1ZGl0TG9nRW50cnkgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBBdWRpdExvZyB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbG9nUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGxvZ1BhdGg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLmxvZ1BhdGggPSBsb2dQYXRoIHx8IHBhdGguam9pbihwcm9jZXNzLmVudi5IT01FIHx8ICd+JywgJy5vcGVuY2xhdycsICdoZXJtaXRjcmFiJywgJ2F1ZGl0Lmpzb25sJyk7XG4gIH1cblxuICAvKipcbiAgICog6L+95Yqg5pel5b+X5p2h55uuXG4gICAqL1xuICBhc3luYyBhcHBlbmQoZW50cnk6IEF1ZGl0TG9nRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGlyID0gcGF0aC5kaXJuYW1lKHRoaXMubG9nUGF0aCk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICBmcy5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbGluZSA9IEpTT04uc3RyaW5naWZ5KGVudHJ5KSArICdcXG4nO1xuICAgICAgZnMuYXBwZW5kRmlsZVN5bmModGhpcy5sb2dQYXRoLCBsaW5lLCB7IG1vZGU6IDBvNjAwIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbQXVkaXRMb2ddIOWGmeWFpeaXpeW/l+Wksei0pTonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5p+l6K+i5pel5b+XICjmnIDov5EgTiDmnaEpXG4gICAqL1xuICBxdWVyeShsaW1pdDogbnVtYmVyID0gNTApOiBBdWRpdExvZ0VudHJ5W10ge1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmModGhpcy5sb2dQYXRoKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModGhpcy5sb2dQYXRoLCAndXRmLTgnKTtcbiAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIGxpbmVzXG4gICAgICAgIC5zbGljZSgtbGltaXQpXG4gICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgLm1hcChsaW5lID0+IEpTT04ucGFyc2UobGluZSkgYXMgQXVkaXRMb2dFbnRyeSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tBdWRpdExvZ10g5p+l6K+i5pel5b+X5aSx6LSlOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5oyJ5p2h5Lu26L+H5ruk5pel5b+XXG4gICAqL1xuICBmaWx0ZXIob3B0aW9uczoge1xuICAgIG1vZHVsZT86IHN0cmluZztcbiAgICBtZXRob2Q/OiBzdHJpbmc7XG4gICAgZGVjaXNpb24/OiBzdHJpbmc7XG4gICAgc291cmNlPzogc3RyaW5nO1xuICAgIHVzZXJJZD86IHN0cmluZztcbiAgICBzdGFydERhdGU/OiBzdHJpbmc7XG4gICAgZW5kRGF0ZT86IHN0cmluZztcbiAgfSk6IEF1ZGl0TG9nRW50cnlbXSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFsbExvZ3MgPSB0aGlzLnF1ZXJ5KDEwMDAwKTsgLy8g5pyA5aSa5p+lIDEwMDAwIOadoVxuXG4gICAgICByZXR1cm4gYWxsTG9ncy5maWx0ZXIoZW50cnkgPT4ge1xuICAgICAgICBpZiAob3B0aW9ucy5tb2R1bGUgJiYgZW50cnkubW9kdWxlICE9PSBvcHRpb25zLm1vZHVsZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAob3B0aW9ucy5tZXRob2QgJiYgZW50cnkubWV0aG9kICE9PSBvcHRpb25zLm1ldGhvZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAob3B0aW9ucy5kZWNpc2lvbiAmJiBlbnRyeS5kZWNpc2lvbiAhPT0gb3B0aW9ucy5kZWNpc2lvbikgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAob3B0aW9ucy5zb3VyY2UgJiYgZW50cnkuc291cmNlICE9PSBvcHRpb25zLnNvdXJjZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAob3B0aW9ucy51c2VySWQgJiYgZW50cnkudXNlcklkICE9PSBvcHRpb25zLnVzZXJJZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAob3B0aW9ucy5zdGFydERhdGUgJiYgZW50cnkudGltZXN0YW1wIDwgb3B0aW9ucy5zdGFydERhdGUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKG9wdGlvbnMuZW5kRGF0ZSAmJiBlbnRyeS50aW1lc3RhbXAgPiBvcHRpb25zLmVuZERhdGUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW0F1ZGl0TG9nXSDov4fmu6Tml6Xlv5flpLHotKU6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bnu5/orqHkv6Hmga9cbiAgICovXG4gIGdldFN0YXRzKCk6IHtcbiAgICB0b3RhbENhbGxzOiBudW1iZXI7XG4gICAgZGVjaXNpb25zOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xuICAgIGF2Z0RlY2lzaW9uVGltZTogbnVtYmVyO1xuICB9IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbG9ncyA9IHRoaXMucXVlcnkoMTAwMDApO1xuICAgICAgXG4gICAgICBjb25zdCBkZWNpc2lvbnM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICAgIGxldCB0b3RhbERlY2lzaW9uVGltZSA9IDA7XG4gICAgICBsZXQgZGVjaXNpb25Db3VudCA9IDA7XG5cbiAgICAgIGZvciAoY29uc3QgbG9nIG9mIGxvZ3MpIHtcbiAgICAgICAgZGVjaXNpb25zW2xvZy5kZWNpc2lvbl0gPSAoZGVjaXNpb25zW2xvZy5kZWNpc2lvbl0gfHwgMCkgKyAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3RhbENhbGxzOiBsb2dzLmxlbmd0aCxcbiAgICAgICAgZGVjaXNpb25zLFxuICAgICAgICBhdmdEZWNpc2lvblRpbWU6IGRlY2lzaW9uQ291bnQgPiAwID8gdG90YWxEZWNpc2lvblRpbWUgLyBkZWNpc2lvbkNvdW50IDogMCxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tBdWRpdExvZ10g6I635Y+W57uf6K6h5aSx6LSlOicsIGVycm9yKTtcbiAgICAgIHJldHVybiB7IHRvdGFsQ2FsbHM6IDAsIGRlY2lzaW9uczoge30sIGF2Z0RlY2lzaW9uVGltZTogMCB9O1xuICAgIH1cbiAgfVxufVxuIl19