# 🦾 LLM-ClawBands 配置指南

## 📍 配置位置

**文件：** `/home/node/.openclaw/openclaw.json`

**路径：** `plugins.entries.llm-clawbands.config`

---

## 🚀 快速配置

### 步骤 1: 编辑 openclaw.json

在 `plugins.entries.llm-clawbands` 中添加 `config`：

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
            "apiKey": "sk-your-api-key",
            "model": "qwen3.5-plus"
          },
          "token": {
            "secret": "your-token-secret-key"
          }
        }
      }
    }
  }
}
```

### 步骤 2: 重启 OpenClaw

```bash
openclaw restart
```

### 步骤 3: 验证配置

```bash
tail -f /home/node/.openclaw/logs/gateway.log | grep "LLM-ClawBands"
```

---

## 📋 完整配置选项

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
            "apiKey": "sk-your-api-key",
            "model": "qwen3.5-plus",
            "temperature": 0.3,
            "maxTokens": 1024,
            "timeout": 30000
          },
          "token": {
            "secret": "your-token-secret-key",
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

## 🔧 配置字段说明

### LLM 配置 (`config.llm`)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `baseUrl` | string | `https://cdn.12ai.org/v1` | LLM API 基础 URL |
| `apiKey` | string | - | **必需** LLM API Key |
| `model` | string | `qwen3.5-plus` | 模型名称 |
| `temperature` | number | `0.3` | 温度 (0-1) |
| `maxTokens` | integer | `1024` | 最大 Token 数 |
| `timeout` | integer | `30000` | 超时时间 (毫秒) |

### 令牌配置 (`config.token`)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `secret` | string | - | 令牌加密密钥 |
| `algorithm` | string | `sha256` | 哈希算法 (`sha256` 或 `argon2id`) |

### 用户画像配置 (`config.profile`)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用画像学习 |
| `trustThreshold` | number | `0.8` | 信任分数阈值 (超过则自动允许) |
| `decayDays` | integer | `30` | 信任分数衰减天数 |

### 风险阈值配置 (`config.riskThresholds`)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `autoAllow` | string | `LOW` | 自动允许的风险等级 |
| `autoDeny` | string | `HIGH` | 自动拒绝的风险等级 |
| `humanReview` | array | `["MEDIUM", "HIGH"]` | 需要人工审批的风险等级 |

---

## 🌐 不同 LLM 提供商配置示例

### OpenAI

```json
{
  "plugins": {
    "entries": {
      "llm-clawbands": {
        "enabled": true,
        "config": {
          "llm": {
            "baseUrl": "https://api.openai.com/v1",
            "apiKey": "sk-openai-your-api-key",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "maxTokens": 1024,
            "timeout": 30000
          }
        }
      }
    }
  }
}
```

### Anthropic Claude

```json
{
  "plugins": {
    "entries": {
      "llm-clawbands": {
        "enabled": true,
        "config": {
          "llm": {
            "baseUrl": "https://api.anthropic.com/v1",
            "apiKey": "sk-ant-your-api-key",
            "model": "claude-3-5-sonnet-20241022",
            "temperature": 0.3,
            "maxTokens": 1024,
            "timeout": 30000
          }
        }
      }
    }
  }
}
```

### 阿里云通义千问

```json
{
  "plugins": {
    "entries": {
      "llm-clawbands": {
        "enabled": true,
        "config": {
          "llm": {
            "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "apiKey": "sk-dashscope-your-api-key",
            "model": "qwen-plus",
            "temperature": 0.3,
            "maxTokens": 1024,
            "timeout": 30000
          }
        }
      }
    }
  }
}
```

### 本地 Ollama

```json
{
  "plugins": {
    "entries": {
      "llm-clawbands": {
        "enabled": true,
        "config": {
          "llm": {
            "baseUrl": "http://localhost:11434/v1",
            "apiKey": "ollama",
            "model": "qwen2.5:7b",
            "temperature": 0.3,
            "maxTokens": 1024,
            "timeout": 60000
          }
        }
      }
    }
  }
}
```

---

## 🔐 安全建议

### 1. API Key 安全

**不要将 API Key 提交到 Git！**

```bash
# 将 openclaw.json 添加到 .gitignore
echo "openclaw.json" >> .gitignore
```

或者使用环境变量：

```json
{
  "plugins": {
    "entries": {
      "llm-clawbands": {
        "enabled": true,
        "config": {
          "llm": {
            "baseUrl": "https://cdn.12ai.org/v1",
            "apiKey": "${CUSTOM_API_KEY}",
            "model": "qwen3.5-plus"
          }
        }
      }
    }
  }
}
```

### 2. 令牌密钥安全

```json
{
  "config": {
    "token": {
      "secret": "生成一个强随机密钥"
    }
  }
}
```

生成随机密钥：
```bash
openssl rand -hex 32
```

---

## 🧪 测试配置

### 1. 检查配置是否生效

```bash
# 查看日志
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

### 2. 测试低风险操作

```
bash('ls -la /tmp')
→ ✅ 自动执行
```

### 3. 测试高风险操作

```
bash('rm -rf /tmp/test')
→ 🦞 发送审批请求
→ 回复：Mengran123 YES
→ ✅ 执行命令
```

---

## ⚠️ 常见问题

### 问题 1: "未配置 API Key"

**解决：**
```json
{
  "config": {
    "llm": {
      "apiKey": "sk-your-actual-api-key"
    }
  }
}
```

### 问题 2: 配置不生效

**检查：**
1. `openclaw.json` 格式是否正确 (JSON)
2. 是否重启了 OpenClaw
3. 配置路径是否正确 (`plugins.entries.llm-clawbands.config`)

### 问题 3: 插件未加载

**检查：**
```bash
# 确保在 allow 列表中
cat /home/node/.openclaw/openclaw.json | grep -A 5 '"allow"'
```

---

## 📝 当前配置状态

你的当前配置：

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
            "model": "qwen3.5-plus"
          }
        }
      }
    }
  }
}
```

**下一步：** 设置 `apiKey` 并重启 OpenClaw！

---

**有问题随时找我！👽**
