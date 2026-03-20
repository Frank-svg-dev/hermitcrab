#!/bin/bash

# 快速测试脚本

echo "🦞 LLM-ClawBands 快速测试"
echo "=========================="
echo ""

# 1. 安装依赖
echo "📦 安装依赖..."
npm install

# 2. 构建
echo "🔨 构建项目..."
npm run build

# 3. 初始化 (使用默认令牌)
echo "🔧 初始化..."
node dist/cli/index.js token add frank Mengran123

# 4. 列出令牌
echo ""
echo "📋 令牌列表:"
node dist/cli/index.js token list

# 5. 查看审计日志 (应该是空的)
echo ""
echo "📊 审计日志:"
node dist/cli/index.js audit

echo ""
echo "✅ 测试完成!"
echo ""
echo "下一步:"
echo "1. 在 OpenClaw 中注册插件钩子"
echo "2. 重启 OpenClaw"
echo "3. 尝试执行一个命令测试拦截功能"
