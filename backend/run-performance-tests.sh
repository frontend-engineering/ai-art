#!/bin/bash

# 性能测试运行脚本
# 自动检查服务状态并运行性能测试

echo "🚀 准备运行性能测试..."
echo ""

# 检查服务器是否运行
echo "📡 检查后端服务器状态..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 后端服务器正在运行"
else
    echo "❌ 后端服务器未运行"
    echo ""
    echo "请先启动后端服务器:"
    echo "  cd backend && pnpm run dev"
    echo ""
    exit 1
fi

echo ""

# 检查数据库是否运行
echo "🗄️  检查数据库状态..."
if docker ps | grep -q mysql; then
    echo "✅ 数据库正在运行"
else
    echo "⚠️  数据库可能未运行"
    echo ""
    echo "如果测试失败，请启动数据库:"
    echo "  docker-compose up -d"
    echo ""
fi

echo ""
echo "=" | tr -d '\n' | xargs printf '%.0s=' {1..60}
echo ""
echo "开始性能测试"
echo "=" | tr -d '\n' | xargs printf '%.0s=' {1..60}
echo ""

# 运行性能测试
node test-performance.js

# 保存退出码
EXIT_CODE=$?

echo ""
echo "=" | tr -d '\n' | xargs printf '%.0s=' {1..60}
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ 性能测试全部通过"
else
    echo "❌ 部分性能测试失败"
    echo ""
    echo "请查看上方详细信息，或参考 PERFORMANCE_TEST_GUIDE.md"
fi

echo "=" | tr -d '\n' | xargs printf '%.0s=' {1..60}
echo ""

exit $EXIT_CODE
