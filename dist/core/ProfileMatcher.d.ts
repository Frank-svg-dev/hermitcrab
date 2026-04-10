/**
 * 用户画像匹配引擎
 * 负责操作指纹匹配和信任分数计算
 */
interface ProfileData {
    fingerprint: string;
    userId: string;
    decisions: DecisionRecord[];
    trustScore: number;
    lastUsed: number;
    createdAt: number;
}
interface DecisionRecord {
    timestamp: number;
    decision: 'APPROVED' | 'DENIED';
    context?: string;
}
export interface ProfileMatch {
    fingerprint: string;
    trustScore: number;
    matchedProfile: ProfileData;
}
export declare class ProfileMatcher {
    private readonly profilesPath;
    private readonly DECAY_DAYS;
    private readonly DECAY_FACTOR;
    private readonly TRUST_THRESHOLD;
    constructor(profilesPath?: string);
    /**
     * 匹配指纹
     */
    match(fingerprint: string): Promise<ProfileMatch | null>;
    /**
     * 学习新决策
     */
    learn(fingerprint: string, userId: string, decision: 'APPROVED' | 'DENIED', context?: string): Promise<void>;
    /**
     * 计算信任分数
     */
    private calculateTrustScore;
    /**
     * 模糊匹配 (编辑距离相似度)
     */
    private findFuzzyMatch;
    /**
     * 计算相似度 (简单字符串相似度)
     */
    private calculateSimilarity;
    /**
     * 计算编辑距离
     */
    private levenshteinDistance;
    /**
     * 加载画像数据
     */
    private loadProfiles;
    /**
     * 保存画像数据
     */
    private saveProfiles;
}
export {};
