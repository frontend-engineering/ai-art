#!/bin/bash

# AI全家福 - 后端部署脚本
# 用法: 
#   ./deploy.sh --init    # 首次部署（安装环境、初始化数据库）
#   ./deploy.sh           # 常规部署（更新代码、重启服务）

set -e

SERVER_USER="root"
SERVER_HOST="106.54.62.162"
SERVER_PATH="/opt/ai-family-photo"
SERVER="${SERVER_USER}@${SERVER_HOST}"
BACKEND_PORT=8123

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# 检查参数
INIT_MODE=false
if [ "$1" = "--init" ]; then
    INIT_MODE=true
fi

# 切换到项目根目录
cd "$(dirname "$0")"

# 读取环境变量
if [ -f "backend/.env" ]; then
    DB_NAME=$(grep "^DB_NAME=" backend/.env | cut -d'=' -f2)
    DB_USER=$(grep "^DB_USER=" backend/.env | cut -d'=' -f2)
else
    log_error "backend/.env 文件不存在，请先配置环境变量"
    exit 1
fi

log_info "=========================================="
if [ "$INIT_MODE" = true ]; then
    log_info "首次部署 - 初始化环境"
else
    log_info "常规部署 - 更新代码"
fi
log_info "=========================================="

# 1. 检查 SSH 连接
log_info "[1/6] 检查服务器连接..."
if ! ssh -o ConnectTimeout=5 ${SERVER} "echo '连接成功'" > /dev/null 2>&1; then
    log_error "无法连接到服务器 ${SERVER}"
    exit 1
fi
log_success "服务器连接正常"

# 2. 上传代码
log_info "[2/6] 上传代码到服务器..."
ssh ${SERVER} "mkdir -p ${SERVER_PATH}"

# 上传后端代码（排除 node_modules 等）
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'logs' \
    --exclude '*.log' \
    --exclude '.git' \
    --exclude '.DS_Store' \
    --exclude 'venv' \
    backend/ ${SERVER}:${SERVER_PATH}/backend/

log_success "代码上传完成"

# 3. 初始化环境（仅首次部署）
if [ "$INIT_MODE" = true ]; then
    log_info "[3/6] 初始化服务器环境..."
    
    # 创建远程初始化脚本
    ssh ${SERVER} "cat > /tmp/init-env.sh << 'SCRIPT_END'
set -e

echo '=== 安装 Node.js 22.12.0 ==='
NODE_VERSION=\$(node -v 2>/dev/null | tr -d 'v' || echo '0.0.0')
NODE_MAJOR=\$(echo \$NODE_VERSION | cut -d'.' -f1)

NEED_INSTALL=false
if ! command -v node &> /dev/null; then
    NEED_INSTALL=true
elif [ \"\$NODE_MAJOR\" -lt 22 ]; then
    NEED_INSTALL=true
fi

if [ \"\$NEED_INSTALL\" = true ]; then
    echo '下载 Node.js...'
    cd /tmp
    wget -q https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz
    tar -xf node-v22.12.0-linux-x64.tar.xz
    rm -rf /usr/local/lib/nodejs
    mkdir -p /usr/local/lib/nodejs
    mv node-v22.12.0-linux-x64 /usr/local/lib/nodejs/node-v22.12.0
    
    ln -sf /usr/local/lib/nodejs/node-v22.12.0/bin/node /usr/local/bin/node
    ln -sf /usr/local/lib/nodejs/node-v22.12.0/bin/npm /usr/local/bin/npm
    ln -sf /usr/local/lib/nodejs/node-v22.12.0/bin/npx /usr/local/bin/npx
    
    export PATH=/usr/local/lib/nodejs/node-v22.12.0/bin:\$PATH
    grep -q 'nodejs/node-v22' ~/.bashrc || echo 'export PATH=/usr/local/lib/nodejs/node-v22.12.0/bin:\$PATH' >> ~/.bashrc
    
    echo \"Node.js 版本: \$(node -v)\"
    rm -f /tmp/node-v22.12.0-linux-x64.tar.xz
else
    echo \"Node.js 已安装: \$(node -v)\"
fi

export PATH=/usr/local/lib/nodejs/node-v22.12.0/bin:\$PATH

echo '=== 安装 pnpm ==='
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
    ln -sf /usr/local/lib/nodejs/node-v22.12.0/bin/pnpm /usr/local/bin/pnpm
fi
echo \"pnpm 版本: \$(pnpm -v)\"

echo '=== 安装 PM2 ==='
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    ln -sf /usr/local/lib/nodejs/node-v22.12.0/bin/pm2 /usr/local/bin/pm2
fi
echo \"PM2 版本: \$(pm2 -v)\"

echo '=== 安装 MariaDB ==='
if ! command -v mysql &> /dev/null; then
    yum install -y mariadb-server mariadb
fi
systemctl start mariadb 2>/dev/null || systemctl start mysqld 2>/dev/null || true
systemctl enable mariadb 2>/dev/null || systemctl enable mysqld 2>/dev/null || true
echo 'MariaDB 已启动'

echo '=== 安装 Python 依赖 ==='
if ! command -v python3 &> /dev/null; then
    yum install -y python3 python3-pip python3-devel
fi
echo \"Python 版本: \$(python3 --version)\"

# 安装 Python 包
pip3 install --quiet Pillow opencv-python-headless qrcode openpyxl numpy requests 2>/dev/null || \
pip3 install Pillow opencv-python-headless qrcode openpyxl numpy requests

echo '=== 环境初始化完成 ==='
SCRIPT_END"
    
    ssh ${SERVER} "chmod +x /tmp/init-env.sh && bash /tmp/init-env.sh && rm -f /tmp/init-env.sh"
    log_success "环境初始化完成"
    
    # 初始化数据库
    log_info "初始化数据库..."
    ssh ${SERVER} "mysql -u root -e \"CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\" && echo '数据库 ${DB_NAME} 创建成功'"
    log_success "数据库初始化完成"
else
    log_info "[3/6] 跳过环境初始化（常规部署）"
fi

# 4. 配置环境变量
log_info "[4/6] 配置环境变量..."

# 复制本地 .env 到服务器
scp backend/.env ${SERVER}:${SERVER_PATH}/backend/.env

# 更新服务器上的配置（端口和数据库密码）
ssh ${SERVER} "sed -i 's/^PORT=.*/PORT=${BACKEND_PORT}/' ${SERVER_PATH}/backend/.env && sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=/' ${SERVER_PATH}/backend/.env"

log_success "环境变量配置完成"

# 5. 安装依赖、执行迁移并启动服务
log_info "[5/6] 安装依赖并启动服务..."

ssh ${SERVER} "cat > /tmp/start-service.sh << 'SCRIPT_END'
set -e
cd /opt/ai-family-photo/backend
export PATH=/usr/local/lib/nodejs/node-v22.12.0/bin:\$PATH

echo '安装依赖...'
pnpm install --prod=false

echo '执行数据库迁移...'
node db/migrate.js

echo '停止旧服务...'
pm2 delete ai-family-photo-backend 2>/dev/null || true
sleep 2

echo '启动服务...'
pm2 start ecosystem.config.js

echo '保存 PM2 配置...'
pm2 save

echo '设置开机自启...'
pm2 startup 2>/dev/null | tail -n 1 | bash 2>/dev/null || true

echo '服务启动完成'
SCRIPT_END"

ssh ${SERVER} "chmod +x /tmp/start-service.sh && bash /tmp/start-service.sh && rm -f /tmp/start-service.sh"
log_success "服务启动完成"

# 6. 验证部署
log_info "[6/6] 验证部署状态..."
sleep 5

ssh ${SERVER} "cat > /tmp/verify.sh << 'SCRIPT_END'
export PATH=/usr/local/lib/nodejs/node-v22.12.0/bin:\$PATH

echo '服务状态:'
pm2 list

echo ''
echo '健康检查:'
echo -n '端口 8123: '
if curl -s -f -m 5 http://localhost:8123/health > /dev/null 2>&1; then
    echo '✓ 健康'
    exit 0
else
    echo '✗ 未响应'
    echo ''
    echo '查看日志: pm2 logs ai-family-photo-backend'
    exit 1
fi
SCRIPT_END"

if ssh ${SERVER} "bash /tmp/verify.sh && rm -f /tmp/verify.sh"; then
    log_success "=========================================="
    log_success "部署成功！"
    log_success "=========================================="
    echo ""
    echo "服务地址:"
    echo "  - Backend API: http://${SERVER_HOST}:${BACKEND_PORT}"
    echo "  - 健康检查:    http://${SERVER_HOST}:${BACKEND_PORT}/health"
    echo ""
    echo "常用命令:"
    echo "  查看日志: ssh ${SERVER} 'pm2 logs ai-family-photo-backend'"
    echo "  查看状态: ssh ${SERVER} 'pm2 list'"
    echo "  重启服务: ssh ${SERVER} 'pm2 restart ai-family-photo-backend'"
else
    ssh ${SERVER} "rm -f /tmp/verify.sh"
    log_error "部署失败，请检查日志"
    exit 1
fi
