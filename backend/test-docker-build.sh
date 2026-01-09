#!/bin/bash

# 本地测试 Docker 镜像构建和运行

set -e

IMAGE_NAME="ai-family-photo-backend"
CONTAINER_NAME="ai-family-photo-test"

echo "=========================================="
echo "🐳 本地测试 Docker 构建"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 未检测到 Docker，请先安装 Docker"
    exit 1
fi

echo ""
echo "📦 构建 Docker 镜像..."
docker build -t "$IMAGE_NAME:test" .

echo ""
echo "✅ 镜像构建成功！"
echo ""
echo "📊 镜像信息："
docker images "$IMAGE_NAME:test"

echo ""
echo "=========================================="
echo "🚀 启动测试容器"
echo "=========================================="

# 停止并删除旧容器（如果存在）
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "🗑️  删除旧容器..."
    docker rm -f "$CONTAINER_NAME" > /dev/null 2>&1
fi

echo ""
echo "🚀 启动新容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p 3001:80 \
    --env-file .env \
    "$IMAGE_NAME:test"

echo ""
echo "✅ 容器启动成功！"
echo ""
echo "📋 容器信息："
docker ps | grep "$CONTAINER_NAME"

echo ""
echo "=========================================="
echo "🧪 测试服务"
echo "=========================================="

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 测试健康检查
echo ""
echo "🏥 测试健康检查端点..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ 健康检查通过"
    curl -s http://localhost:3001/health | jq .
else
    echo "❌ 健康检查失败"
fi

echo ""
echo "=========================================="
echo "📊 查看容器日志"
echo "=========================================="
echo ""
docker logs "$CONTAINER_NAME"

echo ""
echo "=========================================="
echo "✅ 测试完成"
echo "=========================================="
echo ""
echo "💡 有用的命令："
echo "  - 查看日志: docker logs -f $CONTAINER_NAME"
echo "  - 进入容器: docker exec -it $CONTAINER_NAME sh"
echo "  - 停止容器: docker stop $CONTAINER_NAME"
echo "  - 删除容器: docker rm -f $CONTAINER_NAME"
echo "  - 测试 API: curl http://localhost:3001/health"
echo ""
