#!/bin/bash

# 腾讯云 CloudBase 云托管部署脚本
# 使用前请确保已安装 CloudBase CLI: pnpm add -g @cloudbase/cli

set -e

echo "=========================================="
echo "🚀 开始部署到腾讯云 CloudBase 云托管"
echo "=========================================="

# 检查是否安装了 CloudBase CLI
if ! command -v tcb &> /dev/null; then
    echo "❌ 未检测到 CloudBase CLI，正在安装..."
    pnpm add -g @cloudbase/cli
fi

# 检查是否已登录
echo "📝 检查登录状态..."
if ! tcb login --status &> /dev/null; then
    echo "🔐 请先登录 CloudBase..."
    tcb login
fi

# 切换到 backend 目录
cd "$(dirname "$0")"

# 检查环境变量
if [ -z "$TCB_ENV_ID" ]; then
    echo "⚠️  未设置 TCB_ENV_ID 环境变量"
    read -p "请输入云开发环境 ID: " TCB_ENV_ID
    export TCB_ENV_ID
fi

echo "📦 环境 ID: $TCB_ENV_ID"
echo "📦 服务名称: ai-family-photo-api"

# 部署到云托管
echo ""
echo "🚀 开始部署服务..."
echo "⏳ 这可能需要几分钟时间，请耐心等待..."
echo ""

tcb cloudrun deploy \
    --env-id "$TCB_ENV_ID" \
    --service-name "ai-family-photo-api" \
    --dockerfile "./Dockerfile" \
    --cpu 1 \
    --mem 2 \
    --min-num 0 \
    --max-num 5 \
    --port 80 \
    --target-port 80

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📋 后续步骤："
echo ""
echo "1. 配置环境变量"
echo "   访问: https://console.cloud.tencent.com/tcb"
echo "   路径: 云托管 → 服务管理 → ai-family-photo-api → 环境变量"
echo ""
echo "2. 配置云开发 MySQL 数据库"
echo "   路径: 数据库 → MySQL 数据库 → 数据库管理"
echo "   记录内网连接地址并配置到环境变量"
echo ""
echo "3. 更新小程序配置"
echo "   在 miniprogram/app.js 中填入云开发环境 ID: $TCB_ENV_ID"
echo ""
echo "4. 测试服务"
echo "   查看服务日志: tcb cloudrun logs --env-id $TCB_ENV_ID --service-name ai-family-photo-api"
echo ""
echo "=========================================="
echo ""
