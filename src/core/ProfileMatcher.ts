/**
 * 用户画像匹配引擎
 * 负责操作指纹匹配和信任分数计算
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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

interface ProfileStore {
  profiles: ProfileData[];
}

export interface ProfileMatch {
  fingerprint: string;
  trustScore: number;
  matchedProfile: ProfileData;
}

export class ProfileMatcher {
  private readonly profilesPath: string;
  private readonly DECAY_DAYS = 30;
  private readonly DECAY_FACTOR = 0.9;
  private readonly TRUST_THRESHOLD = 0.8;

  constructor(profilesPath?: string) {
    this.profilesPath = profilesPath || path.join(process.env.HOME || '~', '.openclaw', 'hermitcrab', 'profiles.jsonl');
  }

  /**
   * 匹配指纹
   */
  async match(fingerprint: string): Promise<ProfileMatch | null> {
    const profiles = this.loadProfiles();

    // 精确匹配
    const exactMatch = profiles.find(p => p.fingerprint === fingerprint);
    if (exactMatch) {
      const trustScore = this.calculateTrustScore(exactMatch);
      if (trustScore >= this.TRUST_THRESHOLD) {
        return {
          fingerprint,
          trustScore,
          matchedProfile: exactMatch,
        };
      }
    }

    // 模糊匹配 (相似度)
    const fuzzyMatch = this.findFuzzyMatch(fingerprint, profiles);
    if (fuzzyMatch) {
      const trustScore = this.calculateTrustScore(fuzzyMatch);
      if (trustScore >= this.TRUST_THRESHOLD) {
        return {
          fingerprint,
          trustScore,
          matchedProfile: fuzzyMatch,
        };
      }
    }

    return null;
  }

  /**
   * 学习新决策
   */
  async learn(fingerprint: string, userId: string, decision: 'APPROVED' | 'DENIED', context?: string): Promise<void> {
    const profiles = this.loadProfiles();

    // 查找或创建画像
    let profile = profiles.find(p => p.fingerprint === fingerprint);
    
    if (!profile) {
      profile = {
        fingerprint,
        userId,
        decisions: [],
        trustScore: 0.5, // 初始信任分数
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      profiles.push(profile);
    }

    // 添加决策记录
    profile.decisions.push({
      timestamp: Date.now(),
      decision,
      context,
    });

    // 限制决策记录数量 (保留最近 100 条)
    if (profile.decisions.length > 100) {
      profile.decisions = profile.decisions.slice(-100);
    }

    // 更新信任分数
    profile.trustScore = this.calculateTrustScore(profile);
    profile.lastUsed = Date.now();
    profile.userId = userId;

    this.saveProfiles(profiles);
  }

  /**
   * 计算信任分数
   */
  private calculateTrustScore(profile: ProfileData): number {
    if (profile.decisions.length === 0) {
      return 0.5;
    }

    // 时间衰减
    const daysSinceLastUse = (Date.now() - profile.lastUsed) / (1000 * 60 * 60 * 24);
    let decayMultiplier = 1.0;
    if (daysSinceLastUse > this.DECAY_DAYS) {
      const decayPeriods = Math.floor(daysSinceLastUse / this.DECAY_DAYS);
      decayMultiplier = Math.pow(this.DECAY_FACTOR, decayPeriods);
    }

    // 计算基础信任分数
    const approvedCount = profile.decisions.filter(d => d.decision === 'APPROVED').length;
    const totalCount = profile.decisions.length;
    const baseScore = approvedCount / totalCount;

    // 近期决策权重更高 (最近 10 条决策权重 x2)
    const recentDecisions = profile.decisions.slice(-10);
    const recentApproved = recentDecisions.filter(d => d.decision === 'APPROVED').length;
    const recentWeight = recentDecisions.length > 0 ? (recentApproved / recentDecisions.length) * 0.2 : 0;

    // 最终分数 = (基础分数 x 0.8 + 近期分数 x 0.2) x 衰减
    const finalScore = (baseScore * 0.8 + recentWeight) * decayMultiplier;

    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * 模糊匹配 (编辑距离相似度)
   */
  private findFuzzyMatch(fingerprint: string, profiles: ProfileData[]): ProfileData | null {
    let bestMatch: ProfileData | null = null;
    let bestSimilarity = 0;

    for (const profile of profiles) {
      const similarity = this.calculateSimilarity(fingerprint, profile.fingerprint);
      if (similarity > bestSimilarity && similarity >= 0.9) {
        bestSimilarity = similarity;
        bestMatch = profile;
      }
    }

    return bestMatch;
  }

  /**
   * 计算相似度 (简单字符串相似度)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    
    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 加载画像数据
   */
  private loadProfiles(): ProfileData[] {
    try {
      if (!fs.existsSync(this.profilesPath)) {
        const dir = path.dirname(this.profilesPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.profilesPath, '');
        return [];
      }

      const content = fs.readFileSync(this.profilesPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      return lines.map(line => JSON.parse(line) as ProfileData);
    } catch (error) {
      console.error('[ProfileMatcher] 加载画像失败:', error);
      return [];
    }
  }

  /**
   * 保存画像数据
   */
  private saveProfiles(profiles: ProfileData[]): void {
    try {
      const dir = path.dirname(this.profilesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const content = profiles.map(p => JSON.stringify(p)).join('\n');
      fs.writeFileSync(this.profilesPath, content, { mode: 0o600 });
    } catch (error) {
      console.error('[ProfileMatcher] 保存画像失败:', error);
      throw error;
    }
  }
}
