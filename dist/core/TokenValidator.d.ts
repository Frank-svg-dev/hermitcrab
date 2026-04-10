/**
 * 令牌验证模块 - 简化版
 * 直接从 openclaw.json 配置读取令牌比对
 */
export declare class TokenValidator {
    private configPath;
    private tokenSecrets;
    constructor(configPath?: string);
    /**
     * 从配置加载令牌密钥列表
     */
    private loadTokenSecrets;
    /**
     * 验证令牌
     */
    verify(token: string): Promise<{
        valid: boolean;
        userId?: string;
    }>;
    /**
     * 重新加载配置（可选）
     */
    reload(): void;
}
