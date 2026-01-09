#!/bin/bash

# 云托管服务测试脚本

set -e

echo "=========================================="
echo "🧪 测试云托管服务"
echo "=========================================="

# 检查环境变量
if [ -z "$TCB_ENV_ID" ]; then
    read -p "请输入云开发环境 ID: " TCB_ENV_ID
    export TCB_ENV_ID
fi

SERVICE_NAME="ai-family-photo-api"

echo ""
echo "📦 环境 ID: $TCB_ENV_ID"
echo "📦 服务名称: $SERVICE_NAME"
echo ""

# 获取服务信息
echo "📋 获取服务信息..."
tcb cloudrun service describe --env-id "$TCB_ENV_ID" --service-name "$SERVICE_NAME"

echo ""
echo "=========================================="
echo "📊 查看最近日志"
echo "=========================================="
echo ""

# 查看日志
tcb cloudrun logs --env-id "$TCB_ENV_ID" --service-name "$SERVICE_NAME" --limit 50

echo ""
echo "=========================================="
echo "✅ 测试完成"
echo "=========================================="
echo ""
echo "💡 提示："
echo "  - 查看实时日志: tcb cloudrun logs --env-id $TCB_ENV_ID --service-name $SERVICE_NAME --follow"
echo "  - 查看服务详情: tcb cloudrun service describe --env-id $TCB_ENV_ID --service-name $SERVICE_NAME"
echo "  - 重启服务: tcb cloudrun service restart --env-id $TCB_ENV_ID --service-name $SERVICE_NAME"
echo ""
