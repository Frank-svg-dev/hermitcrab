# ✅ LLM-ClawBands 配置完成！

## 📍 配置位置

**文件：** `/home/node/.openclaw/openclaw.json`

**路径：** `plugins.entries.llm-clawbands.config`

---

## 🎯 你的当前配置

```json
{
  "plugins": {
    "allow": ["llm-clawbands"],
    "entries": {
      "llm-clawbands": {
        "enabled": true,
        "config": {
          "llm": {
            "baseUrl": "https://cdn.12ai.org/v1",
            "apiKey": "${CUSTOM_API_KEY}",
            "model": "qwen3.5-plus",
            "temperature": 0.3,
            "maxTokens": 1024,
            "timeout": 30000
          },
          "token": {
            "secret": "llm-clawbands-token-secret-change-me",
            "algorithm": "sha256"
          },
          "profile": {
            "enabled": true,
            "trustThreshold": 0.8,
            "decayDays": 30
          },
          "riskThresholds": {
            "autoAllow": "LOW",
            "autoDeny": "HIGH",
            "humanReview": ["MEDIUM", "HIGH"]
          }
        }
      }
    }
  }
}
```

---

## ⚙️ 配置说明

### 1. LLM 配置 (`config.llm`)

| 字段 | 当前值 | 说明 |
|------|--------|------|
| `baseUrl` | `https://cdn.12ai.org/v1` | LLM API 地址 |
| `apiKey` | `${CUSTOM_API_KEY}` | **需要设置环境变量** |
| `model` | `qwen3.5-plus` | 使用的模型 |
| `temperature` | `0.3` | 创造性 (0-1) |
| `maxTokens` | `1024` | 最大输出长度 |
| `timeout` | `30000` | 超时时间 (30 秒) |

### 2. 令牌配置 (`config.token`)

| 字段 | 当前值 | 说明 |
|------|--------|------|
| `secret` | `llm-clawbands-token-secret-change-me` | **建议修改** |
| `algorithm` | `sha256` | 哈希算法 |

### 3. 用户画像 (`config.profile`)

| 字段 | 当前值 | 说明 |
|------|--------|------|
| `enabled` | `true` | 启用画像学习 |
| `trustThreshold` | `0.8` | 信任阈值 80% |
| `decayDays` | `30` | 30 天衰减 |

### 4. 风险阈值 (`config.riskThresholds`)

| 字段 | 当前值 | 说明 |
|------|--------|------|
| `autoAllow` | `LOW` | 低风险自动允许 |
| `autoDeny` | `HIGH` | 高风险自动拒绝 |
| `humanReview` | `["MEDIUM", "HIGH"]` | 中高风险需人工审批 |

---

## 🔧 下一步操作

### 1. 设置环境变量 (API Key)

```bash
# 设置 API Key
export CUSTOM_API_KEY="sk-your-actual-api-key"

# 验证
echo $CUSTOM_API_KEY
```

### 2. 修改令牌密钥 (可选但推荐)

```bash
# 生成随机密钥
openssl rand -hex 32

# 然后编辑 openclaw.json，替换：
# "secret": "llm-clawbands-token-secret-change-me"
# 改为：
# "secret": "生成的随机密钥"
```

### 3. 构建项目

```bash
cd /home/node/.openclaw/workspace/llm-clawbands
npm install
npm run build
```

### 4. 重启 OpenClaw

```bash
openclaw restart
```

### 5. 验证插件加载

```bash
tail -f /home/node/.openclaw/logs/gateway.log | grep "LLM-ClawBands"
```

**预期输出：**
```
[LLM-ClawBands] 插件注册中...
[LLM-ClawBands] 配置：{...}
[LLM-ClawBands] 拦截器初始化完成
[LLM-ClawBands] LLM 配置：qwen3.5-plus
[LLM-ClawBands] 插件注册完成
```

---

## 🧪 测试

### 测试 1: 低风险操作

```
bash('ls -la /tmp')
```

**预期：** ✅ 自动执行，无需审批

### 测试 2: 高风险操作

```
bash('rm -rf /tmp/test')
```

**预期：** 
1. 🦞 收到审批请求
2. 回复：`Mengran123 YES`
3. ✅ 执行命令

### 测试 3: 查看审计日志

```bash
node /home/node/.openclaw/workspace/llm-clawbands/dist/cli/index.js audit
```

---

## 📖 配置格式参考

完整配置格式参考：[CONFIG-FORMAT.md](CONFIG-FORMAT.md)

### 不同 LLM 提供商配置

```json
// OpenAI
{
  "config": {
    "llm": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-openai-key",
      "model": "gpt-4o-mini"
    }
  }
}

// Anthropic
{
  "config": {
    "llm": {
      "baseUrl": "https://api.anthropic.com/v1",
      "apiKey": "sk-ant-key",
      "model": "claude-3-5-sonnet-20241022"
    }
  }
}

// 阿里云
{
  "config": {
    "llm": {
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "apiKey": "sk-dashscope-key",
      "model": "qwen-plus"
    }
  }
}
```

---

## ⚠️ 安全提醒

1. **不要提交 API Key 到 Git**
   ```bash
   echo "openclaw.json" >> .gitignore
   ```

2. **修改默认令牌密钥**
   ```bash
   openssl rand -hex 32
   ```

3. **限制文件权限**
   ```bash
   chmod 600 /home/node/.openclaw/openclaw.json
   ```

---

## 📂 关键文件

| 文件 | 说明 |
|------|------|
| `/home/node/.openclaw/openclaw.json` | **主配置文件** |
| `/home/node/.openclaw/workspace/llm-clawbands/src/plugin/index.ts` | 插件入口 |
| `/home/node/.openclaw/workspace/llm-clawbands/CONFIG-FORMAT.md` | 配置文档 |

---

## 🆘 故障排查

### 问题 1: "未配置 API Key"

**解决：**
```bash
export CUSTOM_API_KEY="sk-your-api-key"
openclaw restart
```

### 问题 2: 配置不生效

**检查：**
1. JSON 格式是否正确
2. 配置路径是否正确
3. 是否重启了 OpenClaw

### 问题 3: 插件未加载

**检查：**
```bash
cat /home/node/.openclaw/openclaw.json | grep -A 10 '"plugins"'
```

确保 `llm-clawbands` 在 `allow` 列表中。

---

## 🎉 完成！

配置已完成，只需：

1. ✅ 设置 `CUSTOM_API_KEY` 环境变量
2. ✅ 运行 `npm install && npm run build`
3. ✅ 运行 `openclaw restart`
4. ✅ 测试功能

---

**有问题随时找我！👽**
