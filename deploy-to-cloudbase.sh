#!/bin/bash

# CloudBase 云托管自动部署脚本

set -e

ENV_ID="test-1g71tc7eb37627e2"
SERVICE_NAME="express"
PORT="3000"
SOURCE="./backend"

echo "=========================================="
echo "🚀 CloudBase 云托管自动部署"
echo "=========================================="
echo ""
echo "环境 ID: $ENV_ID"
echo "服务名称: $SERVICE_NAME"
echo "容器端口: $PORT"
echo "源目录: $SOURCE"
echo ""
echo "⚠️  重要提示："
echo "   1. 确保已在控制台创建服务: $SERVICE_NAME"
echo "   2. 参考 backend/ENV_VARIABLES.md 配置所有必需变量"
echo ""
echo "开始部署..."
echo ""

# 使用 --force 强制部署，跳过所有确认提示
tcb cloudrun deploy \
  -e "$ENV_ID" \
  -s "$SERVICE_NAME" \
  --port "$PORT" \
  --source "$SOURCE" \
  --force \
  2>&1 | tee deploy.log || true

echo ""
echo "=========================================="
echo "✅ 部署命令已执行"
echo "=========================================="
echo ""
echo "📋 后续步骤："
echo "   1. 查看部署日志: cat deploy.log"
echo "   2. 配置环境变量（必需）: 参考 backend/ENV_VARIABLES.md"
echo "   3. 重启服务使环境变量生效"
echo "   4. 查看服务状态: tcb cloudrun list -e $ENV_ID"
echo "   5. 查看运行日志: tcb cloudrun logs -e $ENV_ID -s $SERVICE_NAME"
echo ""
