# 🦞 LLM-ClawBands - 智能安全中间件

> 融合 LLM 风险评估 + 令牌认证 + 用户画像自学习的 OpenClaw 安全系统

---

## 🎯 核心流程

```
┌──────────────────────────────────────────────────────────────────┐
│                      Agent 调用工具                               │
│                      (write/bash/fetch...)                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 1: 拦截器捕获 before_tool_call                             │
│  - 提取工具信息：module, method, args                            │
│  - 生成操作指纹：hash(module+method+args)                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 2: 画像匹配 (Memory Lookup)                                │
│  - 查询历史审批记录                                               │
│  - 计算相似度分数                                                 │
│  - 高相似度 + 正向历史 → ALLOW (跳过后续步骤)                     │
│  - 无匹配/低相似度 → 继续 Step 3                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 3: LLM 风险评估                                            │
│  - 输入：工具信息 + 上下文 + 安全策略                            │
│  - 输出：风险等级 (LOW/MEDIUM/HIGH) + 分析报告                   │
│  - LOW → ALLOW (记录日志)                                        │
│  - MEDIUM/HIGH → 进入 Step 4                                     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 4: 人类审批 + 令牌验证                                      │
│  - 向用户发送审批请求 + LLM 风险分析报告                          │
│  - 用户回复：口令 + 决策 (如 "Mengran123 YES")                   │
│  - 验证口令 → 错误 → 拒绝 + 告警                                 │
│  - 验证口令 → 正确 → 执行决策                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 5: 学习与记录                                              │
│  - 记录审计日志 (JSON Lines)                                     │
│  - 更新用户画像 (操作指纹 → 决策结果)                             │
│  - LLM 自学习：将新案例加入 Memory                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
hermitcrab/
├── src/
│   ├── core/
│   │   ├── Interceptor.ts        # 工具拦截器 (before_tool_call)
│   │   ├── TokenValidator.ts     # 令牌验证模块
│   │   ├── RiskEngine.ts         # LLM 风险评估引擎
│   │   └── ProfileMatcher.ts     # 画像匹配引擎
│   ├── memory/
│   │   ├── MemoryStore.ts        # Memory 存储 (JSON Lines)
│   │   ├── ProfileStore.ts       # 用户画像存储
│   │   └── AuditLog.ts           # 审计日志
│   ├── llm/
│   │   ├── prompts/
│   │   │   ├── risk-assessment.md    # 风险评估提示词
│   │   │   └── profile-analysis.md   # 画像分析提示词
│   │   └── client.ts             # LLM 客户端封装
│   ├── cli/
│   │   ├── init.ts               # 初始化向导
│   │   ├── policy.ts             # 策略管理
│   │   └── audit.ts              # 审计查询
│   └── plugin/
│       ├── index.ts              # OpenClaw 插件入口
│       └── tools.ts              # clawbands_respond 工具注册
├── memory/
│   ├── decisions.jsonl           # 审批决策记录
│   ├── profiles.jsonl            # 用户画像数据
│   └── audit.jsonl               # 审计日志
├── config/
│   ├── default-policy.json       # 默认安全策略
│   └── tokens.json.enc           # 加密令牌存储
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 令牌机制设计

### 令牌存储
```json
// config/tokens.json.enc (加密存储)
{
  "tokens": [
    {
      "id": "user-frank-001",
      "hash": "$argon2id$v=19$m=65536,t=3,p=4$...",  // Argon2 哈希
      "createdAt": "2026-03-19T04:00:00Z",
      "lastUsed": "2026-03-19T04:30:00Z",
      "permissions": ["approve", "deny", "policy-edit"]
    }
  ]
}
```

### 审批消息格式
```
🦞 LLM-ClawBands 安全审批

操作：bash('rm -rf /tmp/cache')
风险等级：🔴 HIGH

风险分析报告：
- 该操作将删除 /tmp/cache 目录下所有文件
- 可能影响：缓存服务、临时数据处理
- 建议：确认无重要数据后执行

请输入令牌 + 决策：
格式：[令牌] [YES/NO]
示例：Mengran123 YES
```

### 令牌验证流程
```typescript
async function verifyToken(input: string): Promise<{valid: boolean, userId: string}> {
  const [token, decision] = input.split(' ');
  
  // 1. 提取令牌
  // 2. Argon2 验证哈希
  // 3. 检查权限
  // 4. 更新 lastUsed
  // 5. 返回结果
}
```

---

## 🧠 LLM 风险评估

### 提示词模板 (src/llm/prompts/risk-assessment.md)
```markdown
你是一个 AI 安全专家，负责评估 OpenClaw 工具调用的风险等级。

## 评估维度
1. **破坏性**：操作是否可逆？是否会造成数据丢失？
2. **影响范围**：影响单个文件还是整个系统？
3. **敏感性**：是否涉及密码、密钥、配置文件？
4. **网络风险**：是否会向外发送数据？
5. **权限提升**：是否需要 sudo/root 权限？

## 风险等级定义
- **LOW**: 只读操作，影响范围小，可轻松恢复
- **MEDIUM**: 写入操作，影响有限，可恢复
- **HIGH**: 删除/执行操作，影响大，难以恢复

## 输出格式 (JSON)
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "confidence": 0.0-1.0,
  "analysis": "详细分析...",
  "factors": ["因素 1", "因素 2", ...],
  "recommendation": "ALLOW|ASK|DENY"
}

## 当前操作
模块：{{module}}
方法：{{method}}
参数：{{args}}
上下文：{{context}}
```

### 评估示例
```json
{
  "riskLevel": "HIGH",
  "confidence": 0.92,
  "analysis": "rm -rf 是高危命令，会递归删除目录且不可恢复。/tmp/cache 可能包含应用缓存，删除后可能导致服务重启时数据丢失。",
  "factors": ["删除操作", "递归执行", "不可恢复", "影响缓存服务"],
  "recommendation": "ASK"
}
```

---

## 👤 用户画像系统

### 画像数据结构
```jsonl
// memory/profiles.jsonl
{"fingerprint": "sha256:bash:rm-rf:/tmp/*", "userId": "frank", "decisions": [{"timestamp": "...", "decision": "APPROVED", "context": "清理缓存"}], "trustScore": 0.85, "lastUpdated": "..."}
{"fingerprint": "sha256:write:/etc/passwd:*", "userId": "frank", "decisions": [{"timestamp": "...", "decision": "DENIED", "context": "未知"}], "trustScore": 0.1, "lastUpdated": "..."}
```

### 指纹生成算法
```typescript
function generateFingerprint(toolCall: ToolCall): string {
  // 1. 标准化参数 (变量名 → 占位符)
  // 2. 提取命令模式 (rm -rf /tmp/cache → rm -rf /tmp/*)
  // 3. 生成哈希
  return sha256(`${toolCall.module}:${toolCall.method}:${normalizedArgs}`);
}
```

### 相似度匹配
```typescript
async function matchProfile(fingerprint: string): Promise<ProfileMatch | null> {
  // 1. 精确匹配 → 直接返回
  // 2. 模糊匹配 (编辑距离/语义相似度)
  // 3. 计算信任分数
  // 4. 阈值判断：trustScore > 0.8 → 自动 ALLOW
}
```

---

## 📝 自学习机制

### 学习触发条件
1. **人类审批后** → 记录决策 + 上下文
2. **定期回顾** → 分析历史决策模式
3. **置信度提升** → 相似操作自动决策阈值调整

### Memory 更新流程
```
人类审批完成
    ↓
记录到 decisions.jsonl
    ↓
更新/创建 profile 条目
    ↓
LLM 分析决策模式 (可选)
    ↓
调整自动决策阈值
```

### 记忆衰退机制
```typescript
// 超过 30 天未使用的画像，信任分数自动衰减
function decayTrustScore(profile: Profile): number {
  const daysSinceLastUse = daysSince(profile.lastUsed);
  if (daysSinceLastUse > 30) {
    return profile.trustScore * 0.9;  // 每月衰减 10%
  }
  return profile.trustScore;
}
```

---

## 🛠️ 安装与使用

### 安装
```bash
# 克隆项目
git clone https://github.com/your-username/hermitcrab.git
cd hermitcrab

# 安装依赖
npm install

# 初始化
npx hermitcrab init

# 设置令牌
npx hermitcrab token add "Mengran123"
```

### 配置示例
```json
// config/settings.json
{
  "riskThresholds": {
    "autoAllow": "LOW",
    "autoDeny": "HIGH",
    "humanReview": ["MEDIUM", "HIGH"]
  },
  "profileMatching": {
    "enabled": true,
    "trustThreshold": 0.8,
    "similarityThreshold": 0.9
  },
  "token": {
    "algorithm": "argon2id",
    "memoryCost": 65536,
    "timeCost": 3,
    "parallelism": 4
  },
  "learning": {
    "enabled": true,
    "decayDays": 30,
    "decayFactor": 0.9
  }
}
```

### CLI 命令
```bash
hermitcrab init          # 初始化向导
hermitcrab token add     # 添加令牌
hermitcrab token list    # 列出令牌
hermitcrab policy        # 管理安全策略
hermitcrab profile       # 查看用户画像
hermitcrab audit         # 查询审计日志
hermitcrab stats         # 查看统计信息
hermitcrab learn reset   # 重置学习数据
```

---

## 🔒 安全考虑

### 令牌安全
- ✅ Argon2id 哈希存储 (抗 GPU 攻击)
- ✅ 加密存储 (AES-256-GCM)
- ✅ 失败次数限制 (防暴力破解)
- ✅ 令牌轮换机制

### LLM 安全
- ✅ 提示词注入防护
- ✅ 输出验证 (JSON Schema)
- ✅ 置信度阈值检查
- ✅ 降级策略 (LLM 失败 → 默认 ASK)

### 数据安全
- ✅ 审计日志不可篡改 (append-only)
- ✅ 敏感信息脱敏
- ✅ 本地存储优先
- ✅ 可选加密备份

---

## 📊 审计日志示例

```jsonl
// memory/audit.jsonl
{"timestamp": "2026-03-19T04:30:00Z", "module": "FileSystem", "method": "write", "args": ["/tmp/test.txt", "..."], "riskLevel": "LOW", "decision": "ALLOW", "source": "LLM", "userId": null}
{"timestamp": "2026-03-19T04:31:00Z", "module": "Shell", "method": "bash", "args": ["rm -rf /tmp/cache"], "riskLevel": "HIGH", "decision": "APPROVED", "source": "HUMAN", "userId": "frank", "tokenUsed": true, "analysis": "清理缓存，确认无重要数据"}
{"timestamp": "2026-03-19T04:32:00Z", "module": "Shell", "method": "bash", "args": ["rm -rf /tmp/cache"], "riskLevel": "HIGH", "decision": "ALLOW", "source": "PROFILE", "userId": null, "matchedProfile": "sha256:bash:rm-rf:/tmp/*", "trustScore": 0.85}
```

---

## 🚀 开发路线图

### Phase 1: 核心功能 (MVP)
- [ ] 拦截器框架
- [ ] LLM 风险评估
- [ ] 令牌验证
- [ ] 基础审计日志

### Phase 2: 画像系统
- [ ] 指纹生成算法
- [ ] 相似度匹配
- [ ] 信任分数计算
- [ ] 自动决策集成

### Phase 3: 自学习
- [ ] Memory 存储优化
- [ ] 学习算法
- [ ] 记忆衰退机制
- [ ] 置信度自适应

### Phase 4: 增强功能
- [ ] Web 管理界面
- [ ] 多用户支持
- [ ] 远程同步 (可选)
- [ ] 插件市场

---

## 🎭 巴尔坦的备注

> 这个设计融合了三个核心需求，关键是**平衡安全性和便利性**：
> - LLM 初筛减少人类干扰
> - 令牌保证身份安全
> - 画像学习让系统越用越聪明
>
> 下一步我可以帮你实现 MVP 版本，从哪个模块开始？👽
