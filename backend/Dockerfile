# 使用官方 Node.js 轻量级镜像
# Build: 2026-01-15 (使用 Alpine 系统包，无需编译)
FROM node:18-alpine

# 设置时区
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo Asia/Shanghai > /etc/timezone \
    && apk del tzdata

# 安装 Python 和系统依赖
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-numpy \
    py3-pillow \
    py3-opencv \
    wget

# 下载 haarcascade 文件到标准位置
RUN mkdir -p /usr/share/opencv4/haarcascades && \
    wget -q https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml \
    -O /usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml

# 安装 Python 包（只安装不需要编译的包）
RUN pip3 install --no-cache-dir --break-system-packages \
    qrcode==7.4.2 \
    openpyxl==3.1.2 \
    requests==2.31.0

# 定义工作目录
WORKDIR /app

# 安装 pnpm (指定版本以确保兼容性)
RUN npm install -g pnpm@8.15.3

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装生产依赖 (移除 --frozen-lockfile 以允许 lockfile 更新)
RUN pnpm install --prod && \
    pnpm store prune

# 复制应用代码
COPY . .

# 暴露端口（使用 3000 端口）
EXPOSE 3000

# 设置环境变量
ENV PORT=3000 \
    NODE_ENV=production \
    PYTHON_PATH=/usr/bin/python3

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务
CMD ["node", "server.js"]
