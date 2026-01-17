---
inclusion: always
---

# 项目开发规范

本项目的开发必须严格遵守以下规则。这些规则适用于所有代码修改、依赖安装和文件操作。

## 包管理器规范

**强制使用 pnpm，禁止使用 npm**

- ✅ 安装依赖：`pnpm install`
- ✅ 运行脚本：`pnpm run <script>`
- ✅ 添加依赖：`pnpm add <package>`
- ❌ 禁止：`npm install`、`npm run`、`npm install <package>`

## 服务依赖规范

**本地代码直接运行，第三方服务通过 Docker 启动**

- ✅ 前端/后端代码：在本地直接运行
- ✅ 数据库、Redis、消息队列：通过 `docker-compose up -d` 启动
- ❌ 禁止在本地直接安装 PostgreSQL、MySQL、Redis 等服务

启动方式：
```bash
# 1. 启动依赖服务
docker-compose up -d

# 2. 启动后端
cd backend && pnpm run dev

# 3. 启动前端
pnpm run dev
```

## 代码清理规范

**任务完成后必须清理无用文件**

- 删除所有临时文件、测试文件、备份文件
- 删除冗余的脚本和配置
- **最多只保留一个 MD 说明文档**
- 保持项目结构清晰简洁

## 禁用命令

**禁止使用 `cat << 'EOF'` 命令**

- 该命令会在 terminal 执行过程中出错，导致执行崩溃
- 使用 `fsWrite` 或 `strReplace` 工具代替文件写入操作

**禁止向 terminal 发送大量文本**

- 一次性发送大量文本到 terminal 会导致执行崩溃
- 创建或修改文件时，必须使用 `fsWrite`、`fsAppend` 或 `strReplace` 工具
- 禁止使用 `echo` 命令写入大量内容
- 禁止使用任何会向 terminal 输出大量文本的命令

## 执行检查

在执行任何任务时，必须确认：
- [ ] 使用 pnpm 而非 npm
- [ ] 第三方服务通过 Docker 启动
- [ ] 不使用 cat << 'EOF' 命令
- [ ] 使用 fsWrite/fsAppend/strReplace 工具进行文件操作
- [ ] 不向 terminal 发送大量文本输出

任务完成后，必须确认：
- [ ] 删除了所有临时文件和备份文件
- [ ] 合并了多余的文档文件（最多保留 1 个）
- [ ] 项目结构清晰简洁
