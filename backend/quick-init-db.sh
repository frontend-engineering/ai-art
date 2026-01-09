#!/bin/bash

# 快速初始化 CloudBase 数据库
# 使用方法: ./quick-init-db.sh your_password

set -e

if [ -z "$1" ]; then
    echo "❌ 错误: 未提供数据库密码"
    echo ""
    echo "使用方法:"
    echo "  ./quick-init-db.sh YOUR_PASSWORD"
    echo ""
    echo "或者使用环境变量:"
    echo "  DB_PASSWORD=YOUR_PASSWORD ./quick-init-db.sh"
    echo ""
    exit 1
fi

export DB_PASSWORD="$1"

cd "$(dirname "$0")"

echo "🚀 开始初始化 CloudBase 数据库..."
echo ""

node scripts/init-cloudbase-db.js

echo ""
echo "✅ 数据库初始化完成！"
