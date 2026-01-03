# 部署脚本说明

本目录包含用于自动化部署和依赖检测的脚本。

## 脚本列表

### 1. install-ffmpeg.sh

**功能**：自动检测并安装FFmpeg

**支持的操作系统**：
- macOS (使用Homebrew)
- Ubuntu/Debian (使用apt-get)
- CentOS/RHEL (使用yum)

**使用方法**：
```bash
bash backend/scripts/install-ffmpeg.sh
```

**执行流程**：
1. 检测FFmpeg是否已安装
2. 如已安装，显示版本信息并退出
3. 如未安装，检测操作系统类型
4. 根据操作系统选择合适的安装方式
5. 安装完成后验证

**注意事项**：
- macOS需要预先安装Homebrew
- Linux系统可能需要sudo权限
- CentOS/RHEL会自动启用EPEL和RPM Fusion仓库

### 2. check-dependencies.js

**功能**：检测所有系统依赖和配置

**检测项目**：
- Node.js
- Python 3
- FFmpeg
- Python依赖包（PIL, cv2, qrcode, openpyxl）
- .env配置文件
- 环境变量（API密钥等）

**使用方法**：
```bash
cd backend
node scripts/check-dependencies.js

# 或使用npm script
pnpm run check-deps
```

**输出示例**：
```
========================================
系统依赖检测
========================================

步骤 1: 检测系统命令
----------------------------------------
✓ Node.js 已安装
  版本: v18.17.0
✓ Python 3 已安装
  版本: Python 3.11.5
✓ FFmpeg (微动态功能必需) 已安装
  版本: ffmpeg version 6.0

步骤 2: 检测Python依赖包
----------------------------------------
✓ Python包 PIL 已安装
✓ Python包 cv2 已安装
✓ Python包 qrcode 已安装
✓ Python包 openpyxl 已安装

步骤 3: 检测配置文件
----------------------------------------
✓ .env 配置文件存在

步骤 4: 检测环境变量
----------------------------------------
✓ 环境变量 VOLCENGINE_ACCESS_KEY_ID 已配置
✓ 环境变量 VOLCENGINE_SECRET_ACCESS_KEY 已配置
✓ 环境变量 COS_SECRET_ID 已配置
✓ 环境变量 COS_SECRET_KEY 已配置
✓ 环境变量 COS_BUCKET 已配置
✓ 环境变量 COS_REGION 已配置

========================================
✓ 所有依赖检测通过！
========================================
```

**集成到启动流程**：

在`package.json`中已配置为`prestart`脚本，会在`pnpm start`前自动执行：

```json
{
  "scripts": {
    "prestart": "node scripts/check-dependencies.js",
    "start": "node server.js"
  }
}
```

## 部署流程集成

### 本地开发

```bash
# 1. 安装FFmpeg
bash backend/scripts/install-ffmpeg.sh

# 2. 检测依赖
cd backend
pnpm run check-deps

# 3. 启动服务
pnpm start
```

### CI/CD集成

#### GitHub Actions示例

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      
      - name: Install FFmpeg
        run: bash backend/scripts/install-ffmpeg.sh
      
      - name: Install Dependencies
        run: |
          npm install -g pnpm
          pnpm install
          cd backend && pnpm install
          cd backend/utils && pip3 install -r requirements.txt
      
      - name: Check Dependencies
        run: |
          cd backend
          pnpm run check-deps
      
      - name: Deploy
        run: |
          # 部署命令
```

#### Docker集成

在Dockerfile中集成：

```dockerfile
FROM node:18

# 安装系统依赖
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 复制代码
WORKDIR /app
COPY . .

# 安装依赖
RUN npm install -g pnpm && \
    pnpm install && \
    cd backend && pnpm install && \
    cd utils && pip3 install -r requirements.txt

# 检测依赖
RUN cd backend && node scripts/check-dependencies.js

# 启动服务
CMD ["pnpm", "start"]
```

## 故障排除

### FFmpeg安装失败

**问题**：脚本报错"不支持的操作系统"

**解决**：
1. 检查操作系统类型：`uname -a`
2. 手动安装FFmpeg：https://ffmpeg.org/download.html
3. 验证安装：`ffmpeg -version`

### Python包安装失败

**问题**：pip安装报错

**解决**：
```bash
# 升级pip
python3 -m pip install --upgrade pip

# 使用国内镜像源
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 权限问题

**问题**：Linux系统安装需要sudo权限

**解决**：
```bash
# 使用sudo运行脚本
sudo bash backend/scripts/install-ffmpeg.sh

# 或者给当前用户添加sudo权限
```

## 维护说明

### 添加新的依赖检测

在`check-dependencies.js`中添加：

```javascript
// 检测新的命令
checkCommand('new-command', 'New Tool', '安装说明');

// 检测新的Python包
checkPythonPackage('new-package');

// 检测新的环境变量
checkEnvVar('NEW_ENV_VAR', '变量说明');
```

### 更新FFmpeg安装脚本

如需支持新的操作系统，在`install-ffmpeg.sh`中添加：

```bash
# 添加新的操作系统检测
detect_os() {
    # ... 现有代码 ...
    elif [[ -f /etc/new-os-release ]]; then
        echo "newos"
    fi
}

# 添加新的安装函数
install_ffmpeg_newos() {
    echo "正在为 NewOS 安装 FFmpeg..."
    # 安装命令
}

# 在main函数中添加case分支
case $OS in
    # ... 现有代码 ...
    newos)
        install_ffmpeg_newos
        ;;
esac
```

## 相关文档

- [部署检查清单](../DEPLOYMENT_CHECKLIST.md)
- [Docker配置指南](../../DOCKER_SETUP.md)
- [微动态功能实现](../VIDEO_GENERATION_IMPLEMENTATION.md)
