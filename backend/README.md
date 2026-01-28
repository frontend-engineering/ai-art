# AI Family Photo Backend

AI全家福·团圆照相馆后端服务，提供照片生成、用户管理、支付处理和使用次数限制等功能。

## 目录

- [快速开始](#快速开始)
- [数据库设置](#数据库设置)
- [使用次数限制系统](#使用次数限制系统)
- [API文档](#api文档)
- [测试](#测试)
- [部署](#部署)

---

## 快速开始

### 前置要求

- Node.js >= 16
- pnpm (不使用npm)
- Docker & Docker Compose
- MySQL 8.0+

### 安装依赖

```bash
cd backend
pnpm install
```

### 环境配置

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_family_photo

# 火山引擎配置
VOLCENGINE_ACCESS_KEY=your_access_key
VOLCENGINE_SECRET_KEY=your_secret_key

# 微信支付配置
WECHAT_MCHID=your_mchid
WECHAT_SERIAL_NO=your_serial_no
WECHAT_PRIVATE_KEY=your_private_key
```

### 启动服务

1. 启动数据库（使用Docker）：
```bash
docker-compose up -d mysql
```

2. 初始化数据库：
```bash
pnpm run db:init
```

3. 运行数据库迁移：
```bash
pnpm run migrate
```

4. 初始化使用次数系统（为现有用户）：
```bash
pnpm run usage:init
```

5. 启动开发服务器：
```bash
pnpm run dev
```

服务将在 `http://localhost:3000` 启动。

---

## 数据库设置

### 数据库迁移

本项目使用迁移文件管理数据库schema变更。

**查看迁移状态：**
```bash
pnpm run db:migrate:status
```

**执行迁移：**
```bash
pnpm run migrate
```

**验证数据库：**
```bash
pnpm run db:verify
```

### 迁移文件说明

迁移文件位于 `backend/db/migrations/`：

- `001_initial_schema.sql` - 初始数据库schema
- `002_add_error_logs.sql` - 错误日志表
- `003_add_openid_column.sql` - 添加微信openid字段
- `004_extend_users_table.sql` - 扩展users表（使用次数系统）
- `005_create_invite_records.sql` - 邀请记录表
- `006_create_invite_stats.sql` - 邀请统计表
- `007_create_usage_logs.sql` - 使用次数日志表

### 索引验证

验证所有必需的索引已创建：
```bash
pnpm run usage:verify-indexes
```

---

## 使用次数限制系统

### 概述

使用次数限制系统管理用户的照片生成配额，支持：
- 免费用户初始3次使用机会
- 付费用户购买额外使用次数
- 邀请好友获得奖励次数
- 完整的使用历史追踪

### 核心功能

**1. 用户初始化**
- 新用户自动获得3次使用机会
- 自动生成唯一邀请码
- 根据支付历史判断用户类型

**2. 使用次数管理**
- 生成照片时自动扣减
- 生成失败时自动恢复
- 并发安全（行级锁）
- 完整的审计日志

**3. 邀请奖励**
- 每成功邀请1人获得1次机会
- 防止自我邀请和重复邀请
- 实时统计邀请数据

**4. 付费升级**
- Basic套餐：¥9.9，+5次
- Premium套餐：¥29.9，+20次
- 首次付费永久标记

### 数据初始化

为现有用户初始化使用次数系统数据：
```bash
pnpm run usage:init
```

此脚本将：
- 为所有用户设置 `usage_count=3`
- 生成唯一的 `invite_code`
- 根据支付记录设置 `has_ever_paid`
- 创建邀请统计记录

---

## API文档

### 使用次数API

**检查使用次数**
```
GET /api/usage/check/:userId
```

**扣减使用次数**
```
POST /api/usage/decrement
Body: { userId, generationId }
```

**恢复使用次数**
```
POST /api/usage/restore
Body: { userId, generationId }
```

**查询使用历史**
```
GET /api/usage/history/:userId?page=1&pageSize=20
```

### 邀请API

**获取邀请码**
```
GET /api/invite/code/:userId
```

**验证邀请码**
```
GET /api/invite/validate/:inviteCode
```

**处理邀请注册**
```
POST /api/invite/register
Body: { invite_code, new_user_id, openid }
```

**获取邀请统计**
```
GET /api/invite/stats/:userId
```

**获取邀请记录**
```
GET /api/invite/records/:userId?page=1&pageSize=20
```

### 详细API文档

完整的API文档请查看：[docs/USAGE_LIMIT_API.md](./docs/USAGE_LIMIT_API.md)

---

## 测试

### 测试模式（开发调试）

**方法1: 启用测试模式**（跳过使用次数检查）

在 `.env` 文件中设置：
```env
TEST_MODE=true
```

测试模式效果：
- 使用次数检查返回 999 次
- 跳过实际扣减操作
- 用户类型显示为 `test`

⚠️ **注意**：生产环境必须设置 `TEST_MODE=false`

**方法2: 修改用户使用次数**

```bash
# 交互式模式（推荐）
node backend/scripts/reset-usage-count.js -i

# 列出所有用户
node backend/scripts/reset-usage-count.js --list

# 修改指定用户为 100 次
node backend/scripts/reset-usage-count.js <userId> 100

# 修改所有用户为 50 次
node backend/scripts/reset-usage-count.js all 50
```

### 运行所有测试

```bash
pnpm test
```

### 运行特定测试

```bash
# 单元测试
pnpm test usageService.test.js

# 属性测试
pnpm test usageService.property.test.js

# API集成测试
pnpm test usageRoutes.test.js
```

### 测试覆盖率

```bash
pnpm test -- --coverage
```

### 测试策略

本项目采用双重测试方法：

**单元测试**
- 验证特定示例和边界情况
- 测试错误处理
- 快速反馈

**属性测试**
- 使用 fast-check 库
- 每个属性测试运行100+次迭代
- 验证通用属性和并发安全性

---

## 部署

### 本地部署

使用Docker Compose：
```bash
docker-compose up -d
```

### 云托管部署

本项目支持腾讯云CloudBase部署：

1. 配置CloudBase环境变量
2. 运行部署脚本：
```bash
bash deploy-to-cloudbase.sh
```

### 环境检查

部署前检查依赖：
```bash
pnpm run check-deps
```

---

## 开发规范

### 包管理器

**必须使用 pnpm**，禁止使用 npm：
```bash
# ✅ 正确
pnpm install
pnpm add package-name

# ❌ 错误
npm install
npm install package-name
```

### 服务依赖

- ✅ 本地代码直接运行
- ✅ 数据库、Redis等通过Docker启动
- ❌ 禁止本地安装MySQL、PostgreSQL等服务

### 代码清理

- 删除临时文件和测试数据
- 删除冗余脚本和配置
- 最多保留一个主README文档

---

## 脚本命令

### 开发命令

```bash
pnpm run dev          # 启动开发服务器（nodemon）
pnpm start            # 启动生产服务器
pnpm test             # 运行测试
```

### 数据库命令

```bash
pnpm run db:init              # 初始化数据库
pnpm run db:verify            # 验证数据库
pnpm run migrate              # 运行迁移
pnpm run db:migrate:status    # 查看迁移状态
```

### 使用次数系统命令

```bash
pnpm run usage:init           # 初始化现有用户数据
pnpm run usage:verify-indexes # 验证数据库索引
```

### 其他命令

```bash
pnpm run check-deps   # 检查依赖
pnpm run test:api     # 测试API端点
```

---

## 项目结构

```
backend/
├── config/           # 配置文件
├── db/              # 数据库相关
│   ├── migrations/  # 迁移文件
│   └── connection.js
├── docs/            # 文档
│   └── USAGE_LIMIT_API.md
├── routes/          # API路由
├── services/        # 业务逻辑
│   ├── usageService.js
│   ├── inviteService.js
│   └── userService.js
├── scripts/         # 工具脚本
├── utils/           # 工具函数
└── server.js        # 入口文件
```

---

## 故障排查

### 数据库连接失败

1. 检查MySQL是否启动：
```bash
docker-compose ps
```

2. 检查环境变量配置：
```bash
cat .env | grep DB_
```

3. 测试数据库连接：
```bash
pnpm run db:test
```

### 迁移失败

1. 查看迁移状态：
```bash
pnpm run db:migrate:status
```

2. 手动回滚并重试：
```bash
# 连接数据库
mysql -h localhost -u root -p ai_family_photo

# 查看迁移表
SELECT * FROM migrations;

# 删除失败的迁移记录
DELETE FROM migrations WHERE name = 'xxx';
```

### 测试失败

1. 清理测试数据：
```bash
# 重新初始化数据库
pnpm run db:init
pnpm run migrate
```

2. 检查测试日志：
```bash
pnpm test -- --verbose
```

---

## 许可证

MIT

---

## 联系方式

如有问题，请联系开发团队。
