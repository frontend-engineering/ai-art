#!/bin/bash

# 腾讯云 CloudBase MySQL 数据库初始化脚本
# 自动初始化云托管数据库

set -e

echo "=========================================="
echo "🗄️  CloudBase MySQL 数据库初始化"
echo "=========================================="
echo ""

# 数据库配置
DB_HOST="10.2.101.92"
DB_PORT="3306"
DB_USER="root"
DB_NAME="test-1g71tc7eb37627e2"

# 检查是否提供了密码
if [ -z "$DB_PASSWORD" ]; then
    echo "🔐 请输入数据库密码:"
    read -s DB_PASSWORD
    export DB_PASSWORD
    echo ""
fi

echo "📦 数据库信息:"
echo "   主机: $DB_HOST"
echo "   端口: $DB_PORT"
echo "   用户: $DB_USER"
echo "   数据库: $DB_NAME"
echo ""

# 确认执行
read -p "⚠️  确认要初始化数据库吗？这将创建/更新表结构 (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "🚀 开始初始化..."
echo ""

# 切换到 backend 目录
cd "$(dirname "$0")"

# 执行初始化脚本
node scripts/init-cloudbase-db.js

echo ""
echo "✅ 完成！"
echo ""
