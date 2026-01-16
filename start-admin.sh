#!/bin/bash

# AI全家福管理后台 - 快速启动脚本

echo "========================================="
echo "  AI全家福管理后台 - 启动脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 是否运行
echo "1. 检查 Docker 状态..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 运行正常${NC}"
echo ""

# 检查 pnpm 是否安装
echo "2. 检查 pnpm 是否安装..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm 未安装，请先安装 pnpm${NC}"
    echo "   安装命令: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✅ pnpm 已安装${NC}"
echo ""

# 启动 MySQL 数据库
echo "3. 启动 MySQL 数据库..."
if docker ps | grep -q mysql; then
    echo -e "${YELLOW}⚠️  MySQL 已在运行${NC}"
else
    echo "   启动 MySQL 容器..."
    docker-compose up -d mysql
    echo "   等待 MySQL 启动完成..."
    sleep 10
    echo -e "${GREEN}✅ MySQL 启动成功${NC}"
fi
echo ""

# 检查数据库迁移
echo "4. 检查数据库迁移..."
cd backend
if [ ! -f "db/migrations/005_create_admin_tables.sql" ]; then
    echo -e "${RED}❌ 迁移文件不存在${NC}"
    exit 1
fi

echo "   运行数据库迁移..."
pnpm run migrate > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据库迁移可能已执行过${NC}"
fi
cd ..
echo ""

# 检查后端依赖
echo "5. 检查后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "   安装后端依赖..."
    pnpm install
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 后端依赖已存在${NC}"
fi
cd ..
echo ""

# 检查前端依赖
echo "6. 检查前端依赖..."
cd admin
if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖..."
    pnpm install
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 前端依赖已存在${NC}"
fi
cd ..
echo ""

# 启动服务
echo "========================================="
echo "  准备启动服务"
echo "========================================="
echo ""
echo -e "${GREEN}✅ 所有检查通过！${NC}"
echo ""
echo "即将启动以下服务："
echo "  - 后端服务: http://localhost:3000"
echo "  - 管理后台: http://localhost:5173"
echo ""
echo "默认管理员账号："
echo "  用户名: admin"
echo "  密码: Admin@123456"
echo ""
echo -e "${YELLOW}⚠️  首次登录后请立即修改密码！${NC}"
echo ""
echo "按 Ctrl+C 可以停止所有服务"
echo ""
read -p "按 Enter 键继续启动服务..."

# 启动后端服务（后台运行）
echo ""
echo "启动后端服务..."
cd backend
pnpm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}"

# 等待后端启动
echo "等待后端服务就绪..."
sleep 5

# 检查后端是否启动成功
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${RED}❌ 后端服务启动失败，请查看 backend.log${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动前端服务（前台运行）
echo ""
echo "启动前端服务..."
cd admin
pnpm run dev

# 清理（当用户按 Ctrl+C 时）
trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID 2>/dev/null; echo '服务已停止'; exit 0" INT TERM
