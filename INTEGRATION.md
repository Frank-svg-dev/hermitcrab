# 🦞 LLM-ClawBands OpenClaw 集成指南

## 集成方式

有两种方式将 LLM-ClawBands 集成到 OpenClaw：

---

## 方式 1: 本地插件 (推荐用于开发测试)

### 步骤 1: 构建项目

```bash
cd /home/node/.openclaw/workspace/hermitcrab
npm install
npm run build
```

### 步骤 2: 在 openclaw.json 中注册插件

编辑 `/home/node/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "allow": ["hermitcrab"],
    "entries": {
      "hermitcrab": {
        "enabled": true
      }
    },
    "installs": {
      "hermitcrab": {
        "source": "local",
        "spec": "/home/node/.openclaw/workspace/hermitcrab",
        "installPath": "/home/node/.openclaw/workspace/hermitcrab",
        "version": "0.1.0",
        "resolvedName": "hermitcrab",
        "resolvedVersion": "0.1.0",
        "resolvedSpec": "file:/home/node/.openclaw/workspace/hermitcrab",
        "installedAt": "2026-03-19T04:00:00.000Z"
      }
    }
  }
}
```

### 步骤 3: 重启 OpenClaw

```bash
openclaw restart
```

### 步骤 4: 验证插件已加载

```bash
openclaw status
# 或查看日志
tail -f /home/node/.openclaw/logs/gateway.log | grep "LLM-ClawBands"
```

---

## 方式 2: 作为 npm 包安装 (推荐用于生产环境)

### 步骤 1: 发布到 npm (可选)

```bash
cd /home/node/.openclaw/workspace/hermitcrab
npm publish
```

### 步骤 2: 使用 OpenClaw CLI 安装

```bash
openclaw plugins install hermitcrab
```

或安装本地路径：

```bash
openclaw plugins install file:/home/node/.openclaw/workspace/hermitcrab
```

### 步骤 3: 启用插件

```bash
openclaw plugins enable hermitcrab
openclaw restart
```

---

## 方式 3: 手动集成到现有插件

如果你不想创建独立插件，可以将代码集成到现有插件中：

### 步骤 1: 复制核心文件

```bash
# 复制核心模块到你的插件目录
cp -r /home/node/.openclaw/workspace/hermitcrab/src/core /your/plugin/path/
cp -r /home/node/.openclaw/workspace/hermitcrab/src/memory /your/plugin/path/
cp -r /home/node/.openclaw/workspace/hermitcrab/src/types /your/plugin/path/
```

### 步骤 2: 在插件入口注册钩子

```typescript
// 在你的插件 index.js 中
import { Interceptor } from './core/Interceptor';

const interceptor = new Interceptor();

const plugin = {
  id: 'your-plugin',
  register(api) {
    // 注册 before_tool_call 钩子
    api.on('before_tool_call', async (event) => {
      const toolCall = {
        id: event.toolCallId || crypto.randomUUID(),
        module: event.toolName?.split('.')[0] || 'Unknown',
        method: event.toolName?.split('.')[1] || event.toolName || 'unknown',
        args: event.params || [],
        timestamp: Date.now(),
      };

      const result = await interceptor.intercept(toolCall);
      
      if (result.block) {
        event.preventDefault();
        event.blockReason = result.reason;
        
        if (result.reason === 'PENDING_APPROVAL') {
          // 发送审批请求给用户
          await api.sendMessage({
            to: event.userId,
            text: `
🦞 LLM-ClawBands 安全审批

操作：${toolCall.method}(${toolCall.args.map(a => JSON.stringify(a)).join(', ')})
风险等级：🔴 HIGH

请输入令牌 + 决策：
格式：[令牌] [YES/NO]
示例：Mengran123 YES

请求 ID: ${result.requestId}
            `.trim(),
          });
        }
      }
    });

    // 注册 clawbands_respond 工具
    api.registerTool('clawbands_respond', async (requestId, userInput) => {
      return await interceptor.respond(requestId, userInput);
    });
  },
};
```

---

## 配置令牌

### 方式 A: 使用 CLI

```bash
# 添加令牌
node /home/node/.openclaw/workspace/hermitcrab/dist/cli/index.js token add frank Mengran123

# 列出令牌
node /home/node/.openclaw/workspace/hermitcrab/dist/cli/index.js token list
```

### 方式 B: 手动创建令牌文件

创建 `~/.openclaw/hermitcrab/tokens.json`：

```json
{
  "tokens": [
    {
      "id": "frank",
      "hash": "需要计算的哈希值",
      "salt": "随机盐值",
      "createdAt": 1710820800000,
      "lastUsed": 1710820800000,
      "permissions": ["approve", "deny"]
    }
  ]
}
```

**推荐使用 CLI 添加令牌，会自动计算哈希！**

---

## 测试集成

### 1. 测试低风险操作

```bash
# 在 OpenClaw 中执行
bash('ls -la /tmp')
# 预期：自动执行，无需审批
```

### 2. 测试高风险操作

```bash
# 在 OpenClaw 中执行
bash('rm -rf /tmp/test')
# 预期：收到审批请求
```

### 3. 回复审批

```
Mengran123 YES
# 或
Mengran123 NO
```

### 4. 查看审计日志

```bash
node /home/node/.openclaw/workspace/hermitcrab/dist/cli/index.js audit
```

---

## 故障排查

### 问题 1: 插件未加载

**检查日志：**
```bash
tail -f /home/node/.openclaw/logs/gateway.log | grep "LLM-ClawBands"
```

**预期输出：**
```
[LLM-ClawBands] 插件注册中...
[LLM-ClawBands] 拦截器初始化完成
[LLM-ClawBands] 插件注册完成
```

### 问题 2: 工具调用未被拦截

**检查 openclaw.json 配置：**
```bash
cat /home/node/.openclaw/openclaw.json | grep -A 20 '"plugins"'
```

确保 `hermitcrab` 在 `allow` 列表中且 `enabled: true`。

### 问题 3: 令牌验证失败

**重新初始化令牌：**
```bash
node /home/node/.openclaw/workspace/hermitcrab/dist/cli/index.js token remove frank
node /home/node/.openclaw/workspace/hermitcrab/dist/cli/index.js token add frank Mengran123
```

---

## 完整集成示例

### openclaw.json 完整配置

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.8",
    "lastTouchedAt": "2026-03-19T04:00:00.000Z"
  },
  "plugins": {
    "allow": ["hermitcrab"],
    "entries": {
      "hermitcrab": {
        "enabled": true
      }
    },
    "installs": {
      "hermitcrab": {
        "source": "local",
        "spec": "file:/home/node/.openclaw/workspace/hermitcrab",
        "installPath": "/home/node/.openclaw/workspace/hermitcrab",
        "version": "0.1.0",
        "resolvedName": "hermitcrab",
        "resolvedVersion": "0.1.0",
        "resolvedSpec": "file:/home/node/.openclaw/workspace/hermitcrab",
        "installedAt": "2026-03-19T04:00:00.000Z"
      }
    }
  }
}
```

---

## 下一步

1. **构建项目**: `npm run build`
2. **初始化令牌**: `node dist/cli/index.js token add frank Mengran123`
3. **更新 openclaw.json**: 添加插件配置
4. **重启 OpenClaw**: `openclaw restart`
5. **测试**: 执行一个命令看是否触发审批

---

**有问题随时找我！👽**
