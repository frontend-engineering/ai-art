# AI全家福·团圆照相馆 🏮

这个春节，让爱没有距离。

## 项目简介

AI全家福是一个基于AI技术的全家福照片生成应用，支持多种模式：
- **时空拼图**：将分散各地的家人照片合成为完美全家福
- **富贵变身**：一键更换照片背景，让普通照片变身豪门大片

## 🎉 管理后台系统

### 快速启动
```bash
# 一键启动管理后台（推荐）
./start-admin.sh

# 或手动启动
docker-compose up mysql          # 启动数据库
cd backend && pnpm run migrate   # 运行迁移
cd backend && pnpm run dev       # 启动后端
cd admin && pnpm run dev         # 启动前端
```

### 访问地址
- **管理后台**: http://localhost:5173
- **默认账号**: admin / Admin@123456
- **文档**: `.kiro/specs/admin-dashboard/`

### 核心功能
- 🔐 认证系统 - JWT认证、双层权限、操作日志
- 💰 价格管理 - 动态配置、历史记录、定时生效
- 👥 用户管理 - 列表查看、详情展示、状态管理、数据导出
- 📦 订单管理 - 统一视图、状态更新、退款处理、数据导出
- 📊 数据看板 - 实时统计、趋势分析、图表展示

### 详细文档
- [快速开始](./kiro/specs/admin-dashboard/README.md)
- [部署指南](./kiro/specs/admin-dashboard/DEPLOYMENT.md)
- [完整文档](./kiro/specs/admin-dashboard/)

## 最近更新 (2025-01-04)

### 富贵变身模式完整链路修复
- ✅ 修复生成完成后的页面跳转逻辑
- ✅ 创建结果选择页面（4宫格选择）
- ✅ 添加 `/transform/result-selector` 和 `/puzzle/result-selector` 路由
- ✅ 修复 ResultPage 返回逻辑，支持模式化路由
- ✅ 完整的用户流程：上传 → 模板选择 → 生成 → 结果选择 → 成果展示

### 完整流程
```
/transform (落地页)
  ↓
/transform/upload (上传照片)
  ↓
/transform/template (选择模板)
  ↓
/transform/generating (生成中)
  ↓
/transform/result-selector (4宫格选择) ✨ 新增
  ↓
/transform/result (成果展示)
```

### 修复的问题
**问题**: 生成完成后没有看到结果选择页面，直接跳转错误

**原因**: 
1. GeneratingPage 跳转到旧路由 `/generator`
2. 缺少 ResultSelectorPage 组件
3. ResultPage 返回逻辑不支持模式化路由

**解决方案**:
- 创建 `src/pages/ResultSelectorPage.tsx` 使用 FourGridSelector 组件
- 修改 GeneratingPage 根据 mode 跳转到 `/${mode}/result-selector`
- 修改 ResultPage 返回到结果选择页而不是 generator
- 在 App.tsx 添加两个模式的 result-selector 路由

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- TailwindCSS
- Framer Motion（动画）
- React Router（路由）

### 后端
- Node.js + Express
- 火山引擎 AI API（图像生成）
- 腾讯云 COS（对象存储）
- PostgreSQL（数据库）

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose

### 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd backend
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 启动服务

```bash
# 启动数据库等服务
docker-compose up -d

# 启动后端
cd backend
pnpm run dev

# 启动前端（新终端）
pnpm run dev
```

访问 http://localhost:5173

## 项目架构

### 模式化架构

每个产品模式（如时空拼图、富贵变身）都是独立的产品线：

```
/puzzle              # 时空拼图落地页
/puzzle/upload       # 上传页面
/puzzle/template     # 模板选择
/puzzle/generating   # 生成中
/puzzle/result       # 结果页

/transform           # 富贵变身落地页
/transform/upload    # 上传页面
...
```

### 富贵变身模板

已为"富贵变身"模式配置了 7 个高质量背景模板（优先加载前 3 个）：

**优先模板：**
1. **富贵团圆**（默认）- 中国风富贵团圆背景，喜庆大气
2. **豪门盛宴** - 豪门宴会背景，高端大气
3. **雅致居所** - 雅致温馨的家庭背景

**备选模板：**
4. **欧式豪华客厅** - 欧式宫廷风格，水晶吊灯
5. **中式豪宅大厅** - 传统中式建筑，红木家具
6. **现代轻奢客厅** - 现代简约风格，时尚大气
7. **古典宫廷**（高级）- 古典宫廷风格，皇家气派

模板图片位置：`src/assets/templates/transform/`

### 添加新模式

1. 在 `src/config/modes.ts` 定义模式配置
2. 创建 `src/pages/modes/NewModeLaunchScreen.tsx`
3. 在 `src/App.tsx` 注册路由
4. 后端添加对应的 API 处理逻辑

详见 `docs/MODE_ARCHITECTURE.md`

## 开发规范

- ✅ 使用 pnpm 管理依赖
- ✅ 数据库等服务通过 Docker 启动
- ✅ 代码提交前运行 `pnpm run lint`
- ✅ 遵循 TypeScript 类型规范

详见 `DEVELOPMENT_RULES.md`

## 部署

```bash
# 构建前端
pnpm run build

# 构建后端
cd backend
# 后端直接运行，无需构建
```

## 文档

- [产品需求文档](docs/PRD.md)
- [前端需求文档](docs/frontend-PRD.md)
- [模式架构规范](docs/MODE_ARCHITECTURE.md)
- [技术方案](docs/AI全家福·团圆照相馆%20完整技术方案.md)

## License

MIT
