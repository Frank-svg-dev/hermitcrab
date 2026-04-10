"use strict";
/**
 * Memory 存储模块
 * 用于存储用户画像和学习数据
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
exports.MemoryStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MemoryStore {
    memoryPath;
    constructor(memoryPath) {
        this.memoryPath = memoryPath || path.join(process.env.HOME || '~', '.openclaw', 'hermitcrab', 'memory.jsonl');
    }
    /**
     * 写入记忆
     */
    async write(type, data) {
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
        }
        catch (error) {
            console.error('[MemoryStore] 写入记忆失败:', error);
            throw error;
        }
    }
    /**
     * 读取记忆 (按类型)
     */
    read(type, limit = 100) {
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
        }
        catch (error) {
            console.error('[MemoryStore] 读取记忆失败:', error);
            return [];
        }
    }
    /**
     * 搜索记忆
     */
    search(query, limit = 20) {
        try {
            if (!fs.existsSync(this.memoryPath)) {
                return [];
            }
            const content = fs.readFileSync(this.memoryPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            const queryLower = query.toLowerCase();
            return lines
                .map(line => JSON.parse(line))
                .filter(entry => JSON.stringify(entry).toLowerCase().includes(queryLower))
                .slice(-limit)
                .map(entry => entry.data);
        }
        catch (error) {
            console.error('[MemoryStore] 搜索记忆失败:', error);
            return [];
        }
    }
    /**
     * 清除记忆
     */
    clear() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                fs.writeFileSync(this.memoryPath, '', { mode: 0o600 });
            }
        }
        catch (error) {
            console.error('[MemoryStore] 清除记忆失败:', error);
            throw error;
        }
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWVtb3J5U3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWVtb3J5L01lbW9yeVN0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLFdBQVc7SUFDTCxVQUFVLENBQVM7SUFFcEMsWUFBWSxVQUFtQjtRQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ2hILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBWSxFQUFFLElBQVM7UUFDakMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUc7Z0JBQ1osU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxJQUFJO2dCQUNKLElBQUk7YUFDTCxDQUFDO1lBRUYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDMUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFD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O2dCQUNuQyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDekQsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUE5RkQsa0NBOEZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNZW1vcnkg5a2Y5YKo5qih5Z2XXG4gKiDnlKjkuo7lrZjlgqjnlKjmiLfnlLvlg4/lkozlrabkuaDmlbDmja5cbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgTWVtb3J5U3RvcmUge1xuICBwcml2YXRlIHJlYWRvbmx5IG1lbW9yeVBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihtZW1vcnlQYXRoPzogc3RyaW5nKSB7XG4gICAgdGhpcy5tZW1vcnlQYXRoID0gbWVtb3J5UGF0aCB8fCBwYXRoLmpvaW4ocHJvY2Vzcy5lbnYuSE9NRSB8fCAnficsICcub3BlbmNsYXcnLCAnaGVybWl0Y3JhYicsICdtZW1vcnkuanNvbmwnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDlhpnlhaXorrDlv4ZcbiAgICovXG4gIGFzeW5jIHdyaXRlKHR5cGU6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRpciA9IHBhdGguZGlybmFtZSh0aGlzLm1lbW9yeVBhdGgpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgZnMubWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVudHJ5ID0ge1xuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgZGF0YSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGxpbmUgPSBKU09OLnN0cmluZ2lmeShlbnRyeSkgKyAnXFxuJztcbiAgICAgIGZzLmFwcGVuZEZpbGVTeW5jKHRoaXMubWVtb3J5UGF0aCwgbGluZSwgeyBtb2RlOiAwbzYwMCB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW01lbW9yeVN0b3JlXSDlhpnlhaXorrDlv4blpLHotKU6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOivu+WPluiusOW/hiAo5oyJ57G75Z6LKVxuICAgKi9cbiAgcmVhZCh0eXBlOiBzdHJpbmcsIGxpbWl0OiBudW1iZXIgPSAxMDApOiBhbnlbXSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0aGlzLm1lbW9yeVBhdGgpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyh0aGlzLm1lbW9yeVBhdGgsICd1dGYtOCcpO1xuICAgICAgY29uc3QgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgXG4gICAgICByZXR1cm4gbGluZXNcbiAgICAgICAgLm1hcChsaW5lID0+IEpTT04ucGFyc2UobGluZSkpXG4gICAgICAgIC5maWx0ZXIoZW50cnkgPT4gZW50cnkudHlwZSA9PT0gdHlwZSlcbiAgICAgICAgLnNsaWNlKC1saW1pdClcbiAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5kYXRhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW01lbW9yeVN0b3JlXSDor7vlj5borrDlv4blpLHotKU6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmkJzntKLorrDlv4ZcbiAgICovXG4gIHNlYXJjaChxdWVyeTogc3RyaW5nLCBsaW1pdDogbnVtYmVyID0gMjApOiBhbnlbXSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0aGlzLm1lbW9yeVBhdGgpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyh0aGlzLm1lbW9yeVBhdGgsICd1dGYtOCcpO1xuICAgICAgY29uc3QgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgXG4gICAgICBjb25zdCBxdWVyeUxvd2VyID0gcXVlcnkudG9Mb3dlckNhc2UoKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIGxpbmVzXG4gICAgICAgIC5tYXAobGluZSA9PiBKU09OLnBhcnNlKGxpbmUpKVxuICAgICAgICAuZmlsdGVyKGVudHJ5ID0+IFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGVudHJ5KS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5TG93ZXIpXG4gICAgICAgIClcbiAgICAgICAgLnNsaWNlKC1saW1pdClcbiAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5kYXRhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW01lbW9yeVN0b3JlXSDmkJzntKLorrDlv4blpLHotKU6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmuIXpmaTorrDlv4ZcbiAgICovXG4gIGNsZWFyKCk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0aGlzLm1lbW9yeVBhdGgpKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmModGhpcy5tZW1vcnlQYXRoLCAnJywgeyBtb2RlOiAwbzYwMCB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW01lbW9yeVN0b3JlXSDmuIXpmaTorrDlv4blpLHotKU6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG4iXX0=