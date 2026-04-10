"use strict";
/**
 * 令牌验证模块 - 简化版
 * 直接从 openclaw.json 配置读取令牌比对
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
exports.TokenValidator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TokenValidator {
    configPath;
    tokenSecrets = [];
    constructor(configPath) {
        this.configPath = configPath || path.join(process.env.HOME || '/home/node', '.openclaw', 'openclaw.json');
        this.loadTokenSecrets();
    }
    /**
     * 从配置加载令牌密钥列表
     */
    loadTokenSecrets() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                const secrets = config.plugins?.entries?.['hermitcrab']?.config?.token?.secrets;
                if (Array.isArray(secrets)) {
                    this.tokenSecrets = secrets;
                }
                else if (typeof secrets === 'string') {
                    this.tokenSecrets = [secrets];
                }
                else {
                    // 兼容旧的 secret 字段
                    const secret = config.plugins?.entries?.['hermitcrab']?.config?.token?.secret;
                    if (secret) {
                        this.tokenSecrets = [secret];
                    }
                }
                console.log(`[TokenValidator] 已加载 ${this.tokenSecrets.length} 个令牌密钥`);
            }
        }
        catch (error) {
            console.error('[TokenValidator] 加载令牌配置失败:', error.message);
            this.tokenSecrets = [];
        }
    }
    /**
     * 验证令牌
     */
    async verify(token) {
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
    reload() {
        this.loadTokenSecrets();
    }
}
exports.TokenValidator = TokenValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9rZW5WYWxpZGF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29yZS9Ub2tlblZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsTUFBYSxjQUFjO0lBQ2pCLFVBQVUsQ0FBUztJQUNuQixZQUFZLEdBQWEsRUFBRSxDQUFDO0lBRXBDLFlBQVksVUFBbUI7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksQ0FDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksWUFBWSxFQUNoQyxXQUFXLEVBQ1gsZUFBZSxDQUNoQixDQUFDO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCO1FBQ3RCLElBQUksQ0FBQztZQUNILElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDckUsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQztnQkFFaEYsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQzNCLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDO2dCQUM5QixDQUFDO3FCQUFNLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3ZDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEMsQ0FBQztxQkFBTSxDQUFDO29CQUNOLGlCQUFpQjtvQkFDakIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQztvQkFDOUUsSUFBSSxNQUFNLEVBQUUsQ0FBQzt3QkFDWCxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQy9CLENBQUM7Z0JBQ0gsQ0FBQztnQkFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7WUFDeEUsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQWE7UUFDeEIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDM0MsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFFRCxxQkFBcUI7UUFDckIsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkMsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUN6QyxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN2QyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTTtRQUNKLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRjtBQXBFRCx3Q0FvRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOS7pOeJjOmqjOivgeaooeWdlyAtIOeugOWMlueJiFxuICog55u05o6l5LuOIG9wZW5jbGF3Lmpzb24g6YWN572u6K+75Y+W5Luk54mM5q+U5a+5XG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIFRva2VuVmFsaWRhdG9yIHtcbiAgcHJpdmF0ZSBjb25maWdQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgdG9rZW5TZWNyZXRzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZ1BhdGg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLmNvbmZpZ1BhdGggPSBjb25maWdQYXRoIHx8IHBhdGguam9pbihcbiAgICAgIHByb2Nlc3MuZW52LkhPTUUgfHwgJy9ob21lL25vZGUnLCBcbiAgICAgICcub3BlbmNsYXcnLCBcbiAgICAgICdvcGVuY2xhdy5qc29uJ1xuICAgICk7XG4gICAgdGhpcy5sb2FkVG9rZW5TZWNyZXRzKCk7XG4gIH1cblxuICAvKipcbiAgICog5LuO6YWN572u5Yqg6L295Luk54mM5a+G6ZKl5YiX6KGoXG4gICAqL1xuICBwcml2YXRlIGxvYWRUb2tlblNlY3JldHMoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRoaXMuY29uZmlnUGF0aCkpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmModGhpcy5jb25maWdQYXRoLCAndXRmLTgnKSk7XG4gICAgICAgIGNvbnN0IHNlY3JldHMgPSBjb25maWcucGx1Z2lucz8uZW50cmllcz8uWydoZXJtaXRjcmFiJ10/LmNvbmZpZz8udG9rZW4/LnNlY3JldHM7XG4gICAgICAgIFxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzZWNyZXRzKSkge1xuICAgICAgICAgIHRoaXMudG9rZW5TZWNyZXRzID0gc2VjcmV0cztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc2VjcmV0cyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLnRva2VuU2VjcmV0cyA9IFtzZWNyZXRzXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyDlhbzlrrnml6fnmoQgc2VjcmV0IOWtl+autVxuICAgICAgICAgIGNvbnN0IHNlY3JldCA9IGNvbmZpZy5wbHVnaW5zPy5lbnRyaWVzPy5bJ2hlcm1pdGNyYWInXT8uY29uZmlnPy50b2tlbj8uc2VjcmV0O1xuICAgICAgICAgIGlmIChzZWNyZXQpIHtcbiAgICAgICAgICAgIHRoaXMudG9rZW5TZWNyZXRzID0gW3NlY3JldF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW1Rva2VuVmFsaWRhdG9yXSDlt7LliqDovb0gJHt0aGlzLnRva2VuU2VjcmV0cy5sZW5ndGh9IOS4quS7pOeJjOWvhumSpWApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tUb2tlblZhbGlkYXRvcl0g5Yqg6L295Luk54mM6YWN572u5aSx6LSlOicsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgdGhpcy50b2tlblNlY3JldHMgPSBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6aqM6K+B5Luk54mMXG4gICAqL1xuICBhc3luYyB2ZXJpZnkodG9rZW46IHN0cmluZyk6IFByb21pc2U8eyB2YWxpZDogYm9vbGVhbjsgdXNlcklkPzogc3RyaW5nIH0+IHtcbiAgICBpZiAodGhpcy50b2tlblNlY3JldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tUb2tlblZhbGlkYXRvcl0g5pyq6YWN572u5Lu75L2V5Luk54mM5a+G6ZKlJyk7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHVzZXJJZDogJ3VuYXV0aG9yaXplZCcgfTtcbiAgICB9XG5cbiAgICAvLyDpgY3ljobmiYDmnInphY3nva7nmoTku6TniYzvvIzljLnphY3ku7vmhI/kuIDkuKrljbPlj69cbiAgICBmb3IgKGNvbnN0IHNlY3JldCBvZiB0aGlzLnRva2VuU2VjcmV0cykge1xuICAgICAgaWYgKHRva2VuID09PSBzZWNyZXQpIHtcbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIHVzZXJJZDogc2VjcmV0IH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ1tUb2tlblZhbGlkYXRvcl0g5Luk54mM6aqM6K+B5aSx6LSlJyk7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCB1c2VySWQ6ICd1bmF1dGhvcml6ZWQnIH07XG4gIH1cblxuICAvKipcbiAgICog6YeN5paw5Yqg6L296YWN572u77yI5Y+v6YCJ77yJXG4gICAqL1xuICByZWxvYWQoKTogdm9pZCB7XG4gICAgdGhpcy5sb2FkVG9rZW5TZWNyZXRzKCk7XG4gIH1cbn0iXX0=