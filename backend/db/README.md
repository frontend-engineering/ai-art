# 数据库迁移系统

## 概述

本项目使用自定义的数据库迁移系统来管理数据库结构变更，确保数据库版本的可追溯性和一致性。

## 目录结构

```
backend/db/
├── migrations/           # 迁移文件目录
│   ├── 001_initial_schema.sql
│   └── 002_add_error_logs.sql
├── connection.js        # 数据库连接配置
├── migrate.js          # 迁移工具
└── schema.sql          # 完整数据库结构（参考）
```

## 使用方法

### 1. 查看迁移状态

```bash
pnpm run db:migrate:status
```

显示已应用和待执行的迁移。

### 2. 执行迁移

```bash
pnpm run db:migrate
```

自动执行所有待执行的迁移文件。

### 3. 创建新迁移

在 `backend/db/migrations/` 目录下创建新的 SQL 文件，命名格式：

```
<序号>_<描述>.sql
```

例如：`003_add_user_phone.sql`

迁移文件示例：

```sql
-- Migration: 003_add_user_phone
-- Description: 为用户表添加手机号字段
-- Created: 2026-01-05

ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) COMMENT '手机号' AFTER nickname,
ADD INDEX idx_phone (phone);
```

## 迁移记录

所有已执行的迁移记录在 `schema_migrations` 表中：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 自增主键 |
| migration_name | VARCHAR(255) | 迁移文件名 |
| applied_at | TIMESTAMP | 执行时间 |

## 当前数据库表

1. **users** - 用户表
2. **generation_history** - 生成历史记录表
3. **payment_orders** - 支付订单表
4. **product_orders** - 产品订单表
5. **greeting_cards** - 贺卡表
6. **error_logs** - 错误日志表
7. **schema_migrations** - 迁移记录表

## 注意事项

1. 迁移文件一旦执行，不应修改
2. 新的数据库变更应创建新的迁移文件
3. 迁移文件按文件名顺序执行
4. 每个迁移在事务中执行，失败会自动回滚
5. 使用 `IF NOT EXISTS` 确保迁移可重复执行

## 初始化数据库

如果是全新环境，可以使用：

```bash
# 启动 Docker 服务
docker-compose up -d

# 执行迁移
pnpm run db:migrate
```

## 故障排查

### 迁移失败

1. 检查 MySQL 服务是否运行：`docker ps`
2. 检查 `.env` 配置是否正确
3. 查看错误信息，修复 SQL 语法问题
4. 如需重试，确保失败的迁移已回滚

### 查看数据库状态

```bash
# 查看所有表（将 YOUR_PASSWORD 替换为实际密码）
docker exec ai-family-photo-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ai_family_photo -e "SHOW TABLES;"

# 查看表结构
docker exec ai-family-photo-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ai_family_photo -e "DESCRIBE users;"

# 查看迁移记录
docker exec ai-family-photo-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ai_family_photo -e "SELECT * FROM schema_migrations;"
```
