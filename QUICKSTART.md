# 🦞 LLM-ClawBands 快速开始指南

## 已完成的核心功能 (步骤 1-6)

```
✅ 1. 拦截器捕获 → 生成指纹 sha256:bash:rm-rf:/tmp/*
✅ 2. 画像匹配 → 查询历史审批记录
✅ 3. LLM 评估 → 风险等级判断 (LOW/MEDIUM/HIGH)
✅ 4. 发送审批请求 → 带风险分析报告
✅ 5. 用户回复 → "Mengran123 YES"
✅ 6. 令牌验证 → 通过 → 执行命令
```

## 项目文件结构

```
hermitcrab/
├── src/
│   ├── types/index.ts              # 类型定义
│   ├── core/
│   │   ├── Interceptor.ts          # 核心拦截器 (步骤 1-6)
│   │   ├── RiskEngine.ts           # LLM 风险评估
│   │   ├── TokenValidator.ts       # 令牌验证
│   │   └── ProfileMatcher.ts       # 画像匹配
│   ├── memory/
│   │   ├── AuditLog.ts             # 审计日志
│   │   └── MemoryStore.ts          # Memory 存储
│   ├── plugin/index.ts             # OpenClaw 插件入口
│   ├── cli/index.ts                # CLI 工具
│   └── test.ts                     # 测试脚本
├── package.json
├── tsconfig.json
├── README.md
├── DESIGN.md                       # 完整设计文档
└── test.sh                         # 快速测试脚本
```

## 安装与测试

### 1. 安装依赖

```bash
cd /home/node/.openclaw/workspace/hermitcrab
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 初始化令牌

```bash
# 添加令牌 (用户 ID: frank, 令牌：Mengran123)
node dist/cli/index.js token add frank Mengran123

# 验证令牌已添加
node dist/cli/index.js token list
```

### 4. 运行测试

```bash
# 方式 1: 使用测试脚本
node dist/test.js

# 方式 2: 使用 CLI 查看审计日志
node dist/cli/index.js audit
```

## 集成到 OpenClaw

### 在 OpenClaw 插件配置中注册

```javascript
// openclaw.config.js 或插件入口
import { onBeforeToolCall, clawbandsRespond, init } from './hermitcrab/dist/plugin/index.js';

// 初始化插件
await init();

// 注册 before_tool_call 钩子
api.on('before_tool_call', onBeforeToolCall);

// 注册 clawbands_respond 工具 (用于用户回复审批)
api.registerTool('clawbands_respond', async (requestId, userInput) => {
  return clawbandsRespond(requestId, userInput);
});
```

### 用户审批流程

当 Agent 触发高风险操作时：

1. **系统发送审批请求**:
```
🦞 LLM-ClawBands 安全审批

操作：bash('rm -rf /tmp/cache')
风险等级：🔴 HIGH

风险分析报告:
rm 命令会删除文件，且不可恢复...

请输入令牌 + 决策：
格式：[令牌] [YES/NO]
示例：Mengran123 YES
```

2. **用户回复**: `Mengran123 YES`

3. **系统处理**:
   - 验证令牌 ✅
   - 执行命令 ✅
   - 记录画像 (下次相同命令自动允许) ✅

## CLI 命令速查

```bash
# 初始化
node dist/cli/index.js init

# 令牌管理
node dist/cli/index.js token add frank Mengran123
node dist/cli/index.js token list
node dist/cli/index.js token remove frank

# 审计日志
node dist/cli/index.js audit
node dist/cli/index.js audit -l 50
node dist/cli/index.js audit --decision DENY

# 统计信息
node dist/cli/index.js stats
```

## 下一步 (步骤 7)

当前已完成步骤 1-6，下一步可以实现：

**7️⃣ 自学习完善**
- 优化画像匹配算法
- 添加信任分数衰减
- 集成真实 LLM API (目前使用模拟响应)

## 注意事项

1. **LLM 集成**: 当前 `RiskEngine.ts` 使用模拟响应，生产环境需要集成真实 LLM API
2. **令牌加密**: 当前使用 HMAC-SHA256 模拟，建议替换为 Argon2
3. **OpenClaw 集成**: 需要在 OpenClaw 插件系统中注册钩子和工具

---

**有问题随时找我！👽**
