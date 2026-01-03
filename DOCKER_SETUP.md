# Docker 数据库配置指南

本项目使用 Docker 来运行 MySQL 和 Redis 服务。

## 快速开始

### 1. 启动数据库服务

```bash
# 启动 MySQL 和 Redis 容器
docker-compose up -d

# 查看容器状态
docker-compose ps
```

### 2. 验证数据库连接

```bash
cd backend
node db/test-connection.js
```

### 3. 启动后端服务器

```bash
cd backend
node server.js
```

## 容器管理

### 查看容器状态

```bash
docker-compose ps
```

### 查看容器日志

```bash
# 查看 MySQL 日志
docker-compose logs mysql

# 查看 Redis 日志
docker-compose logs redis

# 实时查看日志
docker-compose logs -f
```

### 停止容器

```bash
docker-compose stop
```

### 重启容器

```bash
docker-compose restart
```

### 删除容器和数据

```bash
# 停止并删除容器（保留数据）
docker-compose down

# 停止并删除容器和数据卷
docker-compose down -v
```

## 数据库配置

### MySQL 配置

- **端口**: 3306
- **用户**: root
- **密码**: root123456
- **数据库**: ai_family_photo
- **字符集**: utf8mb4

### Redis 配置

- **端口**: 6379
- **持久化**: AOF (appendonly yes)

## 环境变量

确保 `backend/.env` 文件包含以下配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123456
DB_NAME=ai_family_photo
```

## 数据持久化

数据存储在 Docker 卷中：
- `ai-art_mysql_data` - MySQL 数据
- `ai-art_redis_data` - Redis 数据

即使删除容器，数据也会保留。要完全删除数据，使用：

```bash
docker-compose down -v
```

## 故障排除

### 端口冲突

如果端口 3306 或 6379 已被占用：

1. 停止本地的 MySQL/Redis 服务
2. 或修改 `docker-compose.yml` 中的端口映射

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 重新构建并启动
docker-compose up -d --force-recreate
```

### 数据库连接失败

1. 确认容器正在运行：`docker-compose ps`
2. 检查容器健康状态：`docker-compose ps` 查看 STATUS 列
3. 等待 MySQL 完全启动（约 10-15 秒）
4. 检查 `.env` 文件配置是否正确

## 开发规则

根据项目开发规则：
- ✅ 本地代码（前端/后端）直接在本地运行
- ✅ 数据库、Redis 等服务通过 docker-compose 启动
- ❌ 禁止在本地直接安装 MySQL、Redis 等服务

## 系统依赖安装

### FFmpeg（微动态功能必需）

微动态功能需要 FFmpeg 来转换视频格式。

#### 自动安装（推荐）

```bash
# 运行自动安装脚本
bash backend/scripts/install-ffmpeg.sh
```

#### 手动安装

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

**CentOS/RHEL:**
```bash
sudo yum install -y epel-release
sudo yum install -y ffmpeg
```

#### 验证安装

```bash
ffmpeg -version
```

### Python依赖

```bash
cd backend/utils
pip3 install -r requirements.txt
```

### 依赖检测

在启动应用前，可以运行依赖检测脚本：

```bash
cd backend
pnpm run check-deps
```

该脚本会自动检测：
- Node.js
- Python 3
- FFmpeg
- Python依赖包
- 环境变量配置

## 部署流程

### 1. 克隆代码

```bash
git clone <repository-url>
cd ai-art
```

### 2. 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd backend
pnpm install
```

### 3. 安装系统依赖

```bash
# 自动安装 FFmpeg
bash backend/scripts/install-ffmpeg.sh

# 安装 Python 依赖
cd backend/utils
pip3 install -r requirements.txt
```

### 4. 配置环境变量

```bash
# 复制配置文件
cp backend/.env.example backend/.env

# 编辑配置文件，填入实际的API密钥
vim backend/.env
```

### 5. 启动数据库

```bash
docker-compose up -d
```

### 6. 初始化数据库

```bash
cd backend
pnpm run db:migrate
```

### 7. 检测依赖

```bash
cd backend
pnpm run check-deps
```

### 8. 启动应用

```bash
# 启动后端
cd backend
pnpm start

# 启动前端（新终端）
pnpm run dev
```

## CI/CD集成

在CI/CD流程中，可以添加以下步骤：

```yaml
# .github/workflows/deploy.yml 示例
- name: Install FFmpeg
  run: bash backend/scripts/install-ffmpeg.sh

- name: Check Dependencies
  run: |
    cd backend
    npm run check-deps
```
