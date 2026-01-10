# 云托管 Dockerfile - 构建 backend 服务
FROM node:18-alpine

# 设置时区
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo Asia/Shanghai > /etc/timezone && \
    apk del tzdata

# 工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 只复制 backend 目录的依赖文件
COPY backend/package.json backend/pnpm-lock.yaml ./

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# 复制 backend 代码
COPY backend/ .

# 端口和环境
EXPOSE 80
ENV PORT=80 NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:80/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动
CMD ["node", "server.js"]
