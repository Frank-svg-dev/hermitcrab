#!/bin/bash

# 🦞 LLM-ClawBands 快速集成脚本

set -e

WORKSPACE="/home/node/.openclaw/workspace/llm-clawbands"
OPENCLAW_HOME="/home/node/.openclaw"

echo "🦞 LLM-ClawBands 快速集成"
echo "=========================="
echo ""

# 1. 检查是否已构建
echo "📦 检查构建状态..."
if [ ! -d "$WORKSPACE/dist" ]; then
    echo "⚠️  项目未构建，开始安装依赖并构建..."
    cd "$WORKSPACE"
    npm install
    npm run build
    echo "✅ 构建完成!"
else
    echo "✅ 项目已构建"
fi

# 2. 初始化令牌
echo ""
echo "🔐 初始化令牌..."
if [ ! -f "$OPENCLAW_HOME/llm-clawbands/tokens.json" ]; then
    node "$WORKSPACE/dist/cli/index.js" token add frank Mengran123
    echo "✅ 令牌已初始化 (frank / Mengran123)"
else
    echo "✅ 令牌已存在"
    node "$WORKSPACE/dist/cli/index.js" token list
fi

# 3. 检查 OpenClaw 配置
echo ""
echo "⚙️  检查 OpenClaw 配置..."
if grep -q "llm-clawbands" "$OPENCLAW_HOME/openclaw.json"; then
    echo "✅ 插件已在 openclaw.json 中配置"
else
    echo "⚠️  需要在 openclaw.json 中手动添加插件配置"
    echo "   请参考 INTEGRATION.md 文档"
fi

# 4. 创建数据目录
echo ""
echo "📁 创建数据目录..."
mkdir -p "$OPENCLAW_HOME/llm-clawbands"
echo "✅ 数据目录：$OPENCLAW_HOME/llm-clawbands"

# 5. 显示使用说明
echo ""
echo "=========================="
echo "✅ 集成准备完成!"
echo ""
echo "下一步操作:"
echo "1. 重启 OpenClaw:"
echo "   openclaw restart"
echo ""
echo "2. 验证插件加载:"
echo "   tail -f $OPENCLAW_HOME/logs/gateway.log | grep 'LLM-ClawBands'"
echo ""
echo "3. 测试高风险操作:"
echo "   在 OpenClaw 中执行：bash('rm -rf /tmp/test')"
echo ""
echo "4. 审批格式:"
echo "   Mengran123 YES"
echo ""
echo "5. 查看审计日志:"
echo "   node $WORKSPACE/dist/cli/index.js audit"
echo ""
echo "=========================="
echo "📖 完整文档：$WORKSPACE/INTEGRATION.md"
echo "👽 有问题随时找我!"
