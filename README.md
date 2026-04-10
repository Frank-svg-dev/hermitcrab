# 🦞 LLM-ClawBands

> 智能版 ClawBands - 融合 LLM 风险评估 + 令牌认证 + 用户画像自学习的 OpenClaw 安全系统

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd hermitcrab
npm install
```

### 2. 构建

```bash
npm run build
```

### 3. 初始化

```bash
npm run init
```

初始化向导会问你：
- **安全令牌**: 用于审批验证 (默认：`Mengran123`)
- **令牌 ID**: 用户标识 (默认：`frank`)
- **自学习**: 是否启用 (默认：`是`)

### 4. 启用插件

在 OpenClaw 配置中注册插件钩子：

```javascript
// OpenClaw 插件配置
import { onBeforeToolCall, clawbandsRespond } from 'hermitcrab';

api.on('before_tool_call', onBeforeToolCall);
api.registerTool('clawbands_respond', clawbandsRespond);
```

### 5. 重启 OpenClaw

```bash
openclaw restart
```

---

## 📖 使用示例

### 场景 1: 低风险操作 (自动允许)

```
Agent: bash('ls -la /tmp')
→ LLM 评估：LOW 风险
→ ✅ 自动执行，无需审批
```

### 场景 2: 高风险操作 (需要审批)

```
Agent: bash('rm -rf /tmp/cache')
→ LLM 评估：HIGH 风险
→ 🦞 发送审批请求:

🦞 LLM-ClawBands 安全审批

操作：bash('rm -rf /tmp/cache')
风险等级：🔴 HIGH

风险分析报告:
rm 命令会删除文件，且不可恢复。
特别是使用 -rf 参数时风险极高。

请输入令牌 + 决策：
格式：[令牌] [YES/NO]
示例：Mengran123 YES

→ 用户回复：Mengran123 YES
→ ✅ 令牌验证通过，执行命令
→ 🧠 记录到画像，下次相似操作自动允许
```

### 场景 3: 令牌错误

```
→ 用户回复：WrongToken YES
→ ❌ 令牌验证失败，拒绝执行
→ 🚨 记录安全事件
```

### 场景 4: 画像匹配 (自动允许)

```
Agent: bash('rm -rf /tmp/cache')  # 第二次执行
→ 画像匹配成功，信任分数：0.85
→ ✅ 自动执行，无需审批
```

---

## 🛠️ CLI 命令

```bash
# 初始化
hermitcrab init

# 令牌管理
hermitcrab token add frank           # 添加令牌
hermitcrab token add frank MyPass123 # 指定令牌
hermitcrab token list                # 列出令牌
hermitcrab token remove frank        # 删除令牌

# 审计日志
hermitcrab audit                     # 查看最近 20 条
hermitcrab audit -l 50               # 查看最近 50 条
hermitcrab audit --decision DENY     # 查看拒绝的记录
hermitcrab audit --module Shell      # 查看 Shell 模块

# 统计信息
hermitcrab stats

# 用户画像
hermitcrab profile
```

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent 调用工具                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ 拦截器 → 生成指纹 sha256:bash:rm-rf:/tmp/*              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2️⃣ 画像匹配 → 高信任分数？ → 是 → ALLOW ✅                 │
│                        → 否 → 继续                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3️⃣ LLM 风险评估 → LOW → ALLOW ✅                           │
│                     → HIGH → 需要审批                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4️⃣ 人类审批 + 令牌验证                                      │
│     → 令牌错误 → DENY ❌                                    │
│     → 令牌正确 + YES → APPROVED ✅ → 学习                   │
│     → 令牌正确 + NO → DENY ❌ → 学习                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
hermitcrab/
├── src/
│   ├── core/
│   │   ├── Interceptor.ts        # 核心拦截器
│   │   ├── RiskEngine.ts         # LLM 风险评估
│   │   ├── TokenValidator.ts     # 令牌验证
│   │   └── ProfileMatcher.ts     # 画像匹配
│   ├── memory/
│   │   ├── AuditLog.ts           # 审计日志
│   │   └── MemoryStore.ts        # Memory 存储
│   ├── plugin/
│   │   └── index.ts              # OpenClaw 插件入口
│   └── cli/
│       └── index.ts              # CLI 工具
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 安全特性

- ✅ **令牌加密存储**: HMAC-SHA256 哈希 (生产环境请换 Argon2)
- ✅ **审计日志不可篡改**: JSON Lines 只追加格式
- ✅ **画像信任衰减**: 30 天未用自动降低信任分数
- ✅ **降级策略**: LLM 失败时默认 ASK 人类

---

## 🧪 测试

```bash
# 测试令牌验证
hermitcrab token add testuser TestPass123
hermitcrab token list

# 测试审计日志
hermitcrab audit

# 查看统计
hermitcrab stats
```

---

## 📝 待办事项

- [ ] 集成真实 LLM API (目前使用模拟响应)
- [ ] 添加 Web 管理界面
- [ ] 支持多用户
- [ ] 添加 Argon2 哈希 (替换模拟实现)
- [ ] 添加配置文件支持
- [ ] 添加远程同步功能

---

## 🎭 巴尔坦的备注

> MVP 版本已完成核心流程 1-6 步：
> 1. ✅ 拦截器捕获 + 指纹生成
> 2. ✅ 画像匹配
> 3. ✅ LLM 风险评估
> 4. ✅ 发送审批请求
> 5. ✅ 用户回复处理
> 6. ✅ 令牌验证 + 执行
>
> 下一步可以测试运行，或者继续实现第 7 步 (自学习)！👽

---

**License:** MIT  
**Built with 👽 for a safer AI future**
