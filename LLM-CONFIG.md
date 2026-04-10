# 🦾 LLM-ClawBands 配置指南

## 📍 LLM 配置位置

你有**三种方式**配置 LLM：

---

## 方式 1: 使用 OpenClaw 默认配置 (最简单)

LLM-ClawBands 会自动使用 OpenClaw 已配置的 LLM，**无需额外配置**！

### 当前配置位置

文件：`/home/node/.openclaw/openclaw.json`

```json
{
  "models": {
    "providers": {
      "ppnb": {
        "baseUrl": "https://cdn.12ai.org/v1",
        "apiKey": {
          "source": "env",
          "id": "CUSTOM_API_KEY"
        },
        "models": [
          {
            "id": "qwen3.5-plus",
            "name": "qwen3.5-plus"
          }
        ]
      }
    }
  }
}
```

**环境变量：**
```bash
# API Key 从这里读取
export CUSTOM_API_KEY="sk-your-api-key"
```

**优点：**
- ✅ 无需额外配置
- ✅ 与 OpenClaw 主 Agent 使用相同 LLM
- ✅ 配置集中管理

**缺点：**
- ❌ 无法为 LLM-ClawBands 单独配置不同模型

---

## 方式 2: 使用 LLM-ClawBands 独立配置

### 步骤 1: 创建配置文件

文件：`~/.openclaw/workspace/hermitcrab/config/llm.json`

```json
{
  "llm": {
    "provider": "openai",
    "baseUrl": "https://cdn.12ai.org/v1",
    "apiKey": {
      "source": "env",
      "id": "CUSTOM_API_KEY"
    },
    "model": "qwen3.5-plus",
    "options": {
      "temperature": 0.3,
      "maxTokens": 1024,
      "timeout": 30000
    }
  }
}
```

### 步骤 2: 配置说明

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `llm.provider` | LLM 提供商 | `"openai"` |
| `llm.baseUrl` | API 基础 URL | `"https://cdn.12ai.org/v1"` |
| `llm.apiKey.source` | API Key 来源 | `"env"` |
| `llm.apiKey.id` | 环境变量名 | `"CUSTOM_API_KEY"` |
| `llm.model` | 模型名称 | `"qwen3.5-plus"` |
| `llm.options.temperature` | 温度 (0-1) | `0.3` |
| `llm.options.maxTokens` | 最大 Token 数 | `1024` |
| `llm.options.timeout` | 超时时间 (ms) | `30000` |

### API Key 配置方式

#### 方式 A: 从环境变量读取 (推荐)

```json
{
  "llm": {
    "apiKey": {
      "source": "env",
      "id": "CUSTOM_API_KEY"
    }
  }
}
```

然后在 shell 中设置：
```bash
export CUSTOM_API_KEY="sk-your-actual-api-key"
```

#### 方式 B: 直接写在配置中 (不推荐)

```json
{
  "llm": {
    "apiKey": "sk-your-actual-api-key"
  }
}
```

⚠️ **警告：** 不要将包含真实 API Key 的配置文件提交到 Git！

---

## 方式 3: 使用环境变量

如果没有配置文件，LLM-ClawBands 会从环境变量读取：

```bash
# LLM 基础 URL
export OPENCLAW_LLM_BASEURL="https://cdn.12ai.org/v1"

# API Key
export CUSTOM_API_KEY="sk-your-api-key"

# 模型名称
export OPENCLAW_LLM_MODEL="qwen3.5-plus"
```

---

## 🔧 配置示例

### 示例 1: 使用 OpenAI

```json
{
  "llm": {
    "provider": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": {
      "source": "env",
      "id": "OPENAI_API_KEY"
    },
    "model": "gpt-4o-mini",
    "options": {
      "temperature": 0.3,
      "maxTokens": 1024,
      "timeout": 30000
    }
  }
}
```

### 示例 2: 使用 Anthropic Claude

```json
{
  "llm": {
    "provider": "anthropic",
    "baseUrl": "https://api.anthropic.com/v1",
    "apiKey": {
      "source": "env",
      "id": "ANTHROPIC_API_KEY"
    },
    "model": "claude-3-5-sonnet-20241022",
    "options": {
      "temperature": 0.3,
      "maxTokens": 1024,
      "timeout": 30000
    }
  }
}
```

### 示例 3: 使用本地 Ollama

```json
{
  "llm": {
    "provider": "ollama",
    "baseUrl": "http://localhost:11434/v1",
    "apiKey": "ollama",
    "model": "qwen2.5:7b",
    "options": {
      "temperature": 0.3,
      "maxTokens": 1024,
      "timeout": 60000
    }
  }
}
```

### 示例 4: 使用阿里云通义千问

```json
{
  "llm": {
    "provider": "dashscope",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "apiKey": {
      "source": "env",
      "id": "DASHSCOPE_API_KEY"
    },
    "model": "qwen-plus",
    "options": {
      "temperature": 0.3,
      "maxTokens": 1024,
      "timeout": 30000
    }
  }
}
```

---

## 🧪 测试配置

### 1. 查看当前配置

```bash
cd /home/node/.openclaw/workspace/hermitcrab
npm run build

# 运行测试
node dist/test.js
```

测试输出会显示使用的 LLM 配置：
```
[RiskEngine] LLM 配置已加载：qwen3.5-plus
```

或

```
[RiskEngine] 使用环境变量配置：qwen3.5-plus
```

### 2. 检查配置文件是否生效

```bash
# 查看配置文件
cat ~/.openclaw/workspace/hermitcrab/config/llm.json

# 查看环境变量
env | grep -E "(CUSTOM_API_KEY|OPENCLAW_LLM)"
```

---

## 📊 配置优先级

LLM-ClawBands 按以下顺序查找配置：

1. **配置文件** `config/llm.json` (优先级最高)
2. **环境变量** `OPENCLAW_LLM_*`, `CUSTOM_API_KEY`
3. **OpenClaw 默认配置** (优先级最低)

---

## ⚠️ 常见问题

### 问题 1: "未配置 API Key，使用模拟响应"

**原因：** API Key 未正确配置

**解决：**
```bash
# 检查环境变量
echo $CUSTOM_API_KEY

# 如果为空，设置它
export CUSTOM_API_KEY="sk-your-api-key"

# 或在配置文件中直接指定
```

### 问题 2: "LLM API 请求失败：401"

**原因：** API Key 错误或过期

**解决：**
1. 检查 API Key 是否正确
2. 检查 API Key 是否有足够配额
3. 检查 baseUrl 是否正确

### 问题 3: "LLM API 请求失败：404"

**原因：** 模型名称错误或 baseUrl 错误

**解决：**
```json
{
  "llm": {
    "baseUrl": "https://正确的地址/v1",
    "model": "正确的模型名称"
  }
}
```

### 问题 4: 配置文件不生效

**检查：**
1. 文件路径是否正确：`~/.openclaw/workspace/hermitcrab/config/llm.json`
2. JSON 格式是否正确
3. 是否重启了 OpenClaw

---

## 🔐 安全建议

1. **不要提交 API Key 到 Git**
   ```bash
   # 将 config/llm.json 添加到 .gitignore
   echo "config/llm.json" >> .gitignore
   ```

2. **使用环境变量**
   ```json
   {
     "llm": {
       "apiKey": {
         "source": "env",
         "id": "CUSTOM_API_KEY"
       }
     }
   }
   ```

3. **限制文件权限**
   ```bash
   chmod 600 ~/.openclaw/workspace/hermitcrab/config/llm.json
   ```

4. **定期轮换 API Key**

---

## 📝 当前配置状态

你的当前配置：

| 配置项 | 值 |
|--------|-----|
| 配置方式 | OpenClaw 默认配置 |
| Base URL | `https://cdn.12ai.org/v1` |
| API Key 来源 | 环境变量 `CUSTOM_API_KEY` |
| 默认模型 | `qwen3.5-plus` |

**文件位置：**
- OpenClaw 配置：`/home/node/.openclaw/openclaw.json`
- LLM-ClawBands 配置：`/home/node/.openclaw/workspace/hermitcrab/config/llm.json` (可选)

---

## 🚀 下一步

1. **检查 API Key 是否已设置：**
   ```bash
   echo $CUSTOM_API_KEY
   ```

2. **如果未设置，添加它：**
   ```bash
   export CUSTOM_API_KEY="sk-your-api-key"
   ```

3. **测试配置：**
   ```bash
   cd /home/node/.openclaw/workspace/hermitcrab
   npm run build
   node dist/test.js
   ```

---

**有问题随时找我！👽**
