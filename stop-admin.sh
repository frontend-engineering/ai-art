#!/bin/bash

# AI全家福管理后台 - 停止脚本

echo "========================================="
echo "  AI全家福管理后台 - 停止脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 停止后端服务
echo "1. 停止后端服务..."
BACKEND_PIDS=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
if [ -z "$BACKEND_PIDS" ]; then
    echo -e "${YELLOW}⚠️  后端服务未运行${NC}"
else
    for PID in $BACKEND_PIDS; do
        kill $PID 2>/dev/null
        echo -e "${GREEN}✅ 已停止后端服务 (PID: $PID)${NC}"
    done
fi
echo ""

# 停止前端服务
echo "2. 停止前端服务..."
FRONTEND_PIDS=$(ps aux | grep "vite" | grep "admin" | grep -v grep | awk '{print $2}')
if [ -z "$FRONTEND_PIDS" ]; then
    echo -e "${YELLOW}⚠️  前端服务未运行${NC}"
else
    for PID in $FRONTEND_PIDS; do
        kill $PID 2>/dev/null
        echo -e "${GREEN}✅ 已停止前端服务 (PID: $PID)${NC}"
    done
fi
echo ""

# 询问是否停止 MySQL
echo "3. MySQL 数据库"
read -p "是否停止 MySQL 数据库? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose stop mysql
    echo -e "${GREEN}✅ MySQL 已停止${NC}"
else
    echo -e "${YELLOW}⚠️  MySQL 保持运行${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✅ 服务停止完成${NC}"
echo "========================================="
