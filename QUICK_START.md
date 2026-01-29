# 快速启动指南

## 一键启动（推荐）

### Windows PowerShell
```powershell
# 1. 启动 Docker 依赖
docker-compose up -d

# 2. 启动后端（在新终端）
cd backend
pnpm run dev

# 3. 启动前端（在新终端）
pnpm run dev
```

### macOS/Linux
```bash
# 1. 启动 Docker 依赖
docker-compose up -d

# 2. 启动后端（在新终端）
cd backend && pnpm run dev

# 3. 启动前端（在新终端）
pnpm run dev
```

---

## 开发者模式激活

### 快速激活
在小程序的任何 Launch 页面（时空拼图或富贵变身），**快速点击导航栏 5 次**

**预期效果**：
- 看到 Toast 提示：`🔧 开发者模式已激活`
- 显示开发者面板

### 使用开发者面板

#### 快速设置按钮
一键设置常用次数：
- **0 次** - 测试无次数情况
- **1 次** - 测试单次生成
- **3 次** - 默认免费次数
- **5 次** - 中等次数
- **10 次** - 充足次数
- **99 次** - 测试充足情况

#### 自定义设置
1. 在输入框输入任意非负整数
2. 点击"设置次数"按钮直接设置
3. 或点击"增加次数"按钮增加指定数量

---

## 验证清单

### ✅ 检查 Docker 容器
```bash
docker-compose ps
```

**预期输出**：MySQL 和 Redis 都应该是 `Up` 状态

### ✅ 检查数据库连接
```bash
cd backend
pnpm run db:test
```

**预期输出**：`✅ MySQL 直连成功`

### ✅ 检查后端 API
访问浏览器或使用 curl：
```bash
curl http://localhost:3001/api/dev/status
```

**预期响应**：
```json
{
  "success": true,
  "devMode": true,
  "environment": "development",
  "message": "开发者模式已启用"
}
```

### ✅ 检查小程序登录
在微信开发者工具中打开小程序，应该能正常登录

### ✅ 激活开发者模式
1. 进入时空拼图或富贵变身页面
2. 快速点击导航栏 5 次
3. 看到开发者面板出现

---

## 常见问题

### ❌ 后端启动失败

**检查数据库**：
```bash
cd backend
pnpm run db:test
```

**检查依赖**：
```bash
pnpm install
```

### ❌ 端口 3001 被占用

```bash
# 查看占用进程
netstat -ano | findstr :3001

# 杀死进程（替换 PID）
taskkill /PID <PID> /F
```

### ❌ 小程序无法连接后端

1. 确保后端运行在 `http://localhost:3001`
2. 确保小程序配置中 `USE_LOCAL_SERVER = true`
3. 重新加载小程序（Ctrl+Shift+R）

### ❌ 开发者模式无法激活

1. 确保后端运行在开发环境（`NODE_ENV=development`）
2. 确保在 Launch 页面（时空拼图或富贵变身）
3. 快速点击导航栏 5 次（不是其他区域）
4. 检查浏览器控制台是否有错误

---

## 后端服务状态

当前后端服务已启动：
- 🚀 服务地址：http://localhost:3001
- 🔧 开发者模式：已启用
- 📊 环境：development
- 💾 数据库：MySQL 已连接
- 🔴 Redis：已连接

---

## 下次启动

只需运行：
```bash
# 终端1：启动依赖
docker-compose up -d

# 终端2：启动后端
cd backend && pnpm run dev

# 终端3：启动前端（可选）
pnpm run dev
```

然后在微信开发者工具中打开小程序即可。


---

## 打包体积优化

### ✅ 已完成 OSS 迁移

所有大文件已成功迁移到 OSS 云存储，主包体积大幅减少：

**已迁移文件（共 12.44 MB）**：
- `wealth-icon.png` - 7.00 MB → OSS
- `bg-corners/top-left.png` - 1.29 MB → OSS
- `bg-corners/top-right.png` - 1.55 MB → OSS
- `bg-corners/bottom-left.png` - 1006 KB → OSS
- `bg-corners/bottom-right.png` - 672 KB → OSS
- `common-bg.jpg` - 540 KB → OSS
- `preview-before.jpg` - 206 KB → OSS
- `preview-after.jpg` - 202 KB → OSS
- `lantern.png` - 37 KB → OSS

**OSS 地址**：`https://wms.webinfra.cloud/miniprogram-assets/`

**本地文件清理**：
- ✅ `miniprogram/assets/` 目录已删除（所有文件从 OSS 加载）
- ✅ 主包体积减少 12.44 MB

**已更新页面和组件**：
- ✅ Corner Background 组件 - 四角装饰图片
- ✅ Loading 组件 - lantern.png
- ✅ Four Grid Selector 组件 - lantern.png
- ✅ Transform Launch - wealth-icon.png, preview-before.jpg, preview-after.jpg, common-bg.jpg
- ✅ Transform Upload - common-bg.jpg
- ✅ Transform History - common-bg.jpg
- ✅ Transform Generating - common-bg.jpg
- ✅ Puzzle Launch - common-bg.jpg
- ✅ Puzzle Upload - common-bg.jpg
- ✅ Puzzle History - common-bg.jpg
- ✅ Puzzle Generating - common-bg.jpg
- ✅ Launch (主页) - common-bg.jpg

### 重新上传资源（如需要）

如需添加新的资源文件：
1. 将图片放入 `miniprogram/assets/` 目录
2. 运行上传命令：

```bash
# 上传新资源到 OSS
pnpm run upload:miniprogram-assets
```

上传脚本会自动更新 `miniprogram/utils/oss-assets.js` 配置文件。

**注意**：上传后可以删除 `miniprogram/assets/` 中的本地文件以减少包体积，所有资源将从 OSS 加载。

