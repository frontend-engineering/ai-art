# Python 脚本执行问题修复

## 问题 1: Python 脚本执行失败

### 问题描述
后端调用 `extract_faces.py` 时失败，错误信息为 "Python脚本执行失败: "

### 根本原因
1. **OpenCV cascade 文件路径问题**：脚本无法找到 `haarcascade_frontalface_default.xml` 模型文件
2. **错误日志不完整**：Python 脚本的 stderr 输出没有被正确捕获和显示

### 修复内容

#### 1. 改进 Python 脚本的模型加载逻辑 (`backend/utils/extract_faces.py`)
- 优先使用 `cv2.data.haarcascades` 路径（适用于大多数安装）
- 添加 Windows Miniconda 路径支持
- 添加详细的调试日志，显示尝试加载的每个路径
- 改进错误消息，提供更清晰的失败原因

#### 2. 增强 Python 桥接服务的错误处理 (`backend/services/pythonBridge.js`)
- 添加详细的执行日志（脚本路径、Python 路径、参数）
- 实时输出 stdout 和 stderr 内容
- 改进错误消息，包含退出码和完整输出
- 添加 Python 路径验证和脚本文件存在性检查
- Windows 系统自动使用 `python` 命令而不是 `python3`
- 添加 stdin 写入错误处理

#### 3. 测试结果
- ✅ OpenCV 模型成功加载：`C:\ProgramData\Miniconda3\lib\site-packages\cv2\data\haarcascade_frontalface_default.xml`
- ✅ Python 脚本可以正常执行并返回 JSON 结果
- ✅ 错误日志现在会显示完整的调试信息

---

## 问题 2: 微信登录失败 (500 错误)

### 问题描述
微信小程序登录时返回 400 错误：
```
POST http://localhost:3001/api/wechat/login 400 (Bad Request)
错误码: 40029 - invalid code
```

### 根本原因
1. 初始配置缺失：后端缺少微信小程序的必需配置
2. AppID 不匹配：使用了微信开放平台 Web 应用的 AppID，而不是小程序的 AppID

### 修复内容

#### 1. 识别正确的小程序 AppID
从 `miniprogram/project.config.json` 中获取到正确的小程序 AppID：
```
wx648b96720f4f5e7b
```

#### 2. 更新配置文件
已更新 `backend/.env` 使用正确的小程序 AppID：
```env
WECHAT_APPID=wx648b96720f4f5e7b
WECHAT_SECRET=your_miniprogram_app_secret_here
```

### 解决方案

#### 获取小程序 AppSecret（必需步骤）
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 选择你的小程序（AppID: wx648b96720f4f5e7b）
3. 导航到：开发 -> 开发管理 -> 开发设置
4. 在"开发者ID"部分找到 AppSecret
5. 点击"重置"或"生成"获取 AppSecret（注意：重置后旧的会失效）
6. 复制 AppSecret 并填入 `backend/.env` 文件的 `WECHAT_SECRET` 字段

#### 重启后端
配置完成后，重启后端服务：
```bash
cd backend
pnpm run dev
```

### 注意事项
- ⚠️ **AppSecret 是敏感信息**，不要提交到 Git 仓库
- `.env` 文件已在 `.gitignore` 中，不会被提交
- 开发环境和生产环境需要使用不同的 AppID 和 AppSecret
- **重要**：之前从生产环境配置文件中找到的 `wx8d6764156629f0db` 是微信开放平台 Web 应用的 AppID，不是小程序的 AppID
- 小程序的正确 AppID 是：`wx648b96720f4f5e7b`（已从 project.config.json 获取）
- 你需要从微信公众平台获取对应的 AppSecret 才能完成配置

### 当前状态
❌ **微信登录功能暂不可用** - 需要配置正确的 AppSecret

配置完成后，微信登录功能才能正常工作。

---

## 使用说明
1. 配置微信小程序 AppID 和 AppSecret
2. 重启后端服务
3. 在微信开发者工具中测试登录功能
4. 如果遇到问题，查看后端日志获取详细错误信息
