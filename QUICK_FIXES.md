# 快速修复清单

## 立即可以修复的问题

### 1. 云函数环境变量配置文档

**文件位置：** `miniprogram/cloudfunctions/wxpayFunctions/README.md`

**需要添加的内容：**

```markdown
# 云函数环境变量配置

## 必需的环境变量

在云函数控制台中配置以下环境变量：

### API_BASE_URL
- **说明：** 后端API的基础URL
- **示例：** `https://your-api-domain.com`
- **用途：** 用于调用价格查询API

## 配置步骤

1. 登录腾讯云云开发控制台
2. 进入云函数管理
3. 选择 `wxpayFunctions` 云函数
4. 点击"环境变量"标签
5. 添加以下环境变量：
   - 键：`API_BASE_URL`
   - 值：`https://your-api-domain.com`（替换为实际域名）
6. 保存并重新部署云函数

## 验证

部署后，可以通过云函数日志查看是否成功调用价格API：
- 成功：日志中显示"从API获取价格配置成功"
- 失败：日志中显示"从API获取价格失败，使用降级方案"
```

### 2. 小程序全局配置

**文件位置：** `miniprogram/app.js`

**需要确认的配置：**

```javascript
App({
  globalData: {
    apiBaseUrl: 'https://your-api-domain.com', // 确保配置正确的API域名
    // ... 其他配置
  }
})
```

### 3. 环境变量配置文档

**文件位置：** `.env.example`

**需要添加的内容：**

```bash
# 后端API配置
API_BASE_URL=http://localhost:3001

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_family_photo

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=2h

# 微信支付配置
WECHAT_PAY_MCHID=your_mchid
WECHAT_PAY_SERIAL_NO=your_serial_no
WECHAT_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WECHAT_PAY_APIV3_KEY=your_apiv3_key

# 管理员默认账户
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=Admin@123456
```

### 4. 部署检查脚本

**文件位置：** `scripts/pre-deploy-check.sh`

```bash
#!/bin/bash

echo "🔍 部署前检查..."

# 检查环境变量
echo "检查环境变量..."
if [ ! -f .env ]; then
    echo "❌ 错误：.env 文件不存在"
    echo "请复制 .env.example 并配置正确的值"
    exit 1
fi

# 检查数据库连接
echo "检查数据库连接..."
pnpm --prefix backend run test:db-connection || {
    echo "❌ 错误：数据库连接失败"
    exit 1
}

# 检查依赖安装
echo "检查依赖..."
cd backend && pnpm install --frozen-lockfile || exit 1
cd ../admin && pnpm install --frozen-lockfile || exit 1
cd ..

# 运行测试
echo "运行测试..."
cd backend && pnpm test || {
    echo "⚠️  警告：部分测试失败"
    read -p "是否继续部署？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}
cd ..

# 构建前端
echo "构建管理后台前端..."
cd admin && pnpm build || {
    echo "❌ 错误：前端构建失败"
    exit 1
}
cd ..

echo "✅ 部署前检查完成"
```

### 5. 快速回滚脚本

**文件位置：** `scripts/rollback.sh`

```bash
#!/bin/bash

echo "🔄 开始回滚..."

# 停止服务
echo "停止服务..."
pm2 stop backend || true

# 恢复数据库
echo "恢复数据库..."
read -p "请输入备份文件路径: " BACKUP_FILE
if [ -f "$BACKUP_FILE" ]; then
    mysql -u root -p ai_family_photo < "$BACKUP_FILE"
    echo "✅ 数据库恢复完成"
else
    echo "❌ 备份文件不存在"
    exit 1
fi

# 恢复代码
echo "恢复代码..."
git checkout HEAD~1 || {
    echo "❌ 代码回滚失败"
    exit 1
}

# 重新安装依赖
echo "重新安装依赖..."
cd backend && pnpm install
cd ../admin && pnpm install && pnpm build
cd ..

# 重启服务
echo "重启服务..."
pm2 restart backend

echo "✅ 回滚完成"
```

---

## 需要手动执行的检查

### 1. 验证价格配置

```bash
# 1. 检查数据库中的价格配置
mysql -u root -p ai_family_photo -e "SELECT * FROM price_configs WHERE status='active';"

# 2. 测试价格API
curl http://localhost:3001/api/prices/current

# 3. 检查缓存是否生效（第二次调用应该更快）
time curl http://localhost:3001/api/prices/current
time curl http://localhost:3001/api/prices/current
```

### 2. 验证支付流程

```bash
# 1. 创建测试订单
curl -X POST http://localhost:3001/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "generationId": "test-gen-id",
    "packageType": "basic"
  }'

# 2. 查询订单状态
curl http://localhost:3001/api/payment/order/{orderId}
```

### 3. 验证管理后台

```bash
# 1. 启动管理后台
cd admin && pnpm dev

# 2. 访问 http://localhost:5173
# 3. 使用默认账户登录：admin / Admin@123456
# 4. 测试以下功能：
#    - 价格配置管理
#    - 用户列表查看
#    - 订单列表查看
#    - 数据看板展示
```

### 4. 验证小程序端

```bash
# 1. 在微信开发者工具中打开小程序项目
# 2. 检查 app.js 中的 apiBaseUrl 配置
# 3. 测试支付流程：
#    - 上传图片
#    - 选择模板
#    - 生成图片
#    - 选择套餐
#    - 发起支付
```

### 5. 验证H5端

```bash
# 1. 启动H5开发服务器
pnpm dev

# 2. 访问 http://localhost:5173
# 3. 测试支付流程
```

---

## 性能检查

### 1. API响应时间

```bash
# 使用 Apache Bench 测试
ab -n 100 -c 10 http://localhost:3001/api/prices/current

# 预期结果：
# - 平均响应时间 < 100ms（有缓存）
# - 成功率 100%
```

### 2. 数据库查询性能

```sql
-- 检查慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 查看慢查询日志
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 检查索引使用情况
EXPLAIN SELECT * FROM price_configs WHERE status='active' AND effective_date <= NOW();
```

### 3. 缓存效果

```bash
# 第一次调用（无缓存）
time curl http://localhost:3001/api/prices/current

# 第二次调用（有缓存）
time curl http://localhost:3001/api/prices/current

# 预期：第二次调用明显更快
```

---

## 安全检查

### 1. SQL注入测试

```bash
# 测试价格查询API
curl "http://localhost:3001/api/prices/current?category=package' OR '1'='1"

# 预期：应该返回错误或正常结果，不应该暴露数据库错误
```

### 2. 认证测试

```bash
# 测试未认证访问
curl http://localhost:3001/admin-api/prices

# 预期：返回401 Unauthorized

# 测试错误token
curl -H "Authorization: Bearer invalid_token" http://localhost:3001/admin-api/prices

# 预期：返回401 Unauthorized
```

### 3. 权限测试

```bash
# 使用operator角色尝试创建价格配置
# 预期：返回403 Forbidden（只有super_admin可以创建）
```

---

## 监控设置

### 1. 日志监控

```bash
# 后端日志
tail -f backend/logs/error.log
tail -f backend/logs/access.log

# 数据库日志
tail -f /var/log/mysql/error.log
```

### 2. 性能监控

```bash
# CPU和内存使用
top -p $(pgrep -f "node.*backend")

# 数据库连接数
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

### 3. 告警设置

- 设置API响应时间告警（>1s）
- 设置错误率告警（>1%）
- 设置数据库连接数告警（>80%）
- 设置磁盘空间告警（>90%）

---

## 完成检查清单

- [ ] 云函数环境变量已配置
- [ ] 小程序apiBaseUrl已配置
- [ ] .env文件已创建并配置
- [ ] 数据库连接正常
- [ ] 价格API测试通过
- [ ] 支付流程测试通过
- [ ] 管理后台功能正常
- [ ] 小程序端功能正常
- [ ] H5端功能正常
- [ ] 性能测试通过
- [ ] 安全测试通过
- [ ] 监控已设置
- [ ] 备份已创建
- [ ] 回滚方案已准备

---

**完成以上检查后，系统即可上线！**
