@echo off
chcp 65001 >nul
echo ========================================
echo   AI全家福 - 一键启动脚本
echo ========================================
echo.

echo [1/4] 检查环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未找到，请重启终端后再试
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [安装 pnpm...]
    call npm install -g pnpm
)

echo ✅ 环境检查完成
echo.

echo [2/4] 安装依赖...
if not exist "node_modules" (
    echo 安装前端依赖...
    call pnpm install
)

if not exist "backend\node_modules" (
    echo 安装后端依赖...
    cd backend
    call pnpm install
    cd ..
)

echo ✅ 依赖安装完成
echo.

echo [3/4] 启动 Docker 服务...
docker-compose up -d 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Docker 未启动，跳过数据库（可使用 Mock 模式）
) else (
    echo ✅ Docker 服务已启动
    echo 等待数据库就绪...
    timeout /t 10 /nobreak >nul
    cd backend
    call pnpm run db:init 2>nul
    cd ..
)

echo.
echo [4/4] 启动开发服务器...
echo.
echo ✅ 准备完成！
echo.
echo 📌 访问地址：
echo    前端: http://localhost:3000
echo    后端: http://localhost:3001
echo.
echo 正在启动服务器...
echo.

start "AI全家福-后端" cmd /k "cd backend && pnpm run dev"
timeout /t 3 /nobreak >nul
start "AI全家福-前端" cmd /k "pnpm run dev"

echo.
echo ✅ 服务器已启动！
echo.
pause
