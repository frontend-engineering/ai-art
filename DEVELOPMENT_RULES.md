# 开发调试军规

本项目的开发必须严格遵守以下规则：

## 1. 包管理器规范

**禁止使用 npm，必须使用 pnpm**

```bash
# ✅ 正确
pnpm install
pnpm run dev
pnpm add <package>

# ❌ 错误
npm install
npm run dev
npm install <package>
```

## 2. 服务依赖规范

**本地代码单独启动，所有第三方依赖服务通过 Docker 启动**

- ✅ 本地代码（前端/后端）：直接在本地运行
- ✅ 数据库、Redis、消息队列等：通过 docker-compose 启动
- ❌ 禁止在本地直接安装 PostgreSQL、MySQL、Redis 等服务

```bash
# 启动依赖服务
docker-compose up -d

# 本地启动代码
cd backend && go run main.go
cd web && pnpm run dev
```

## 3. 代码清理规范

**AI 工作完成后必须清理无用代码和文件**

- 删除所有临时文件、测试文件、备份文件
- 删除冗余的脚本和配置
- **最多只保留一个 MD 说明文档**
- 保持项目结构清晰简洁

```bash
# 清理示例
rm -rf *.backup
rm -rf temp_*
# 合并多个说明文档为一个
```



## 4 禁用 cat << 'EOF'
不要使用 cat << 'EOF' ... 这个命令，这个命令会在terminal执行的过程中出错，导致执行崩溃

---

**这些规则是强制性的，所有开发人员和 AI 助手必须严格遵守。**
