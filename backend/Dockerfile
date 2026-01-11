# 使用官方 Node.js 轻量级镜像
FROM node:18-alpine

# 设置时区为上海，安装 Python 和必要依赖
RUN apk add --no-cache \
    tzdata \
    python3 \
    py3-pip \
    py3-numpy \
    py3-pillow \
    py3-requests \
    # OpenCV 依赖
    libstdc++ \
    libgcc \
    musl \
    # 图像处理依赖
    jpeg-dev \
    zlib-dev \
    libpng-dev \
    # 设置时区
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo Asia/Shanghai > /etc/timezone \
    && apk del tzdata

# 安装 Python 包（使用 --break-system-packages 因为 Alpine 3.19+ 需要）
RUN pip3 install --no-cache-dir --break-system-packages \
    opencv-python-headless>=4.8.0 \
    qrcode>=7.4.2 \
    openpyxl>=3.1.0

# 定义工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# 复制应用代码
COPY . .

# 暴露端口（云托管使用 80 端口）
EXPOSE 80

# 设置环境变量
ENV PORT=80 \
    NODE_ENV=production \
    PYTHON_PATH=/usr/bin/python3

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:80/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务
CMD ["node", "server.js"]
