# 云函数与后端服务 API 对接文档

> 版本: 1.0.0  
> 更新时间: 2026-01-27  
> 适用范围: 微信支付云函数 ↔ 业务后端服务

## 📋 目录

- [概述](#概述)
- [数据库表结构](#数据库表结构)
- [API 接口规范](#api-接口规范)
- [数据流转流程](#数据流转流程)
- [环境变量配置](#环境变量配置)
- [错误处理](#错误处理)
- [安全规范](#安全规范)

---

## 概述

### 架构说明

本项目采用**云函数 + 业务后端**的混合架构：

- **云函数层**：处理微信支付相关操作（下单、回调、退款）
- **业务后端**：处理业务逻辑（用户权益、生成任务、订单管理）
- **数据库**：共享 MySQL 数据库，双方都可读写

### 核心原则

1. **数据库优先**：云函数直接写入数据库，后端监听数据库变化
2. **API 备份**：数据库不可用时，云函数通过 API 通知后端
3. **幂等性**：所有接口支持重复调用，不会产生副作用
4. **异步处理**：支付回调异步通知后端，不阻塞主流程

---

## 数据库表结构

### 核心表清单

| 表名 | 用途 | 云函数 | 后端 |
|------|------|--------|------|
| `users` | 用户信息 | ✅ 读写 | ✅ 读写 |
| `payment_orders` | 支付订单 | ✅ 读写 | ✅ 读写 |
| `refunds` | 退款记录 | ✅ 读写 | ✅ 读写 |
| `payment_logs` | 支付日志 | ✅ 写入 | ✅ 读取 |
| `generation_history` | 生成历史 | ❌ | ✅ 读写 |
| `product_orders` | 实体产品订单 | ❌ | ✅ 读写 |
| `greeting_cards` | 电子贺卡 | ❌ | ✅ 读写 |
| `error_logs` | 错误日志 | ❌ | ✅ 读写 |

### 1. users 表

用户基础信息表

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY COMMENT '用户ID (UUID)',
  openid VARCHAR(100) UNIQUE COMMENT '微信OpenID',
  unionid VARCHAR(100) COMMENT '微信UnionID',
  nickname VARCHAR(100) COMMENT '用户昵称',
  avatar_url TEXT COMMENT '头像URL',
  phone VARCHAR(20) COMMENT '手机号',
  payment_status ENUM('free', 'basic', 'premium') DEFAULT 'free' COMMENT '付费状态',
  regenerate_count INT DEFAULT 3 COMMENT '重新生成次数',
  last_login_at TIMESTAMP COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid),
  INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

**字段说明：**

- `id`: 用户唯一标识，格式 `user-{timestamp}-{random}`
- `openid`: 微信小程序 OpenID，用于支付和身份识别
- `unionid`: 微信 UnionID，用于跨应用用户识别
- `payment_status`: 付费状态
  - `free`: 免费用户（默认）
  - `basic`: 尝鲜包用户
  - `premium`: 尊享包用户
- `regenerate_count`: 剩余重新生成次数

**云函数操作：**
- 创建用户（通过 openid 查找不存在时自动创建）
- 查询用户（验证 user_id 有效性）

**后端操作：**
- 更新用户权益（支付成功后）
- 查询用户信息
- 更新用户资料

### 2. payment_orders 表

支付订单表（核心表）

```sql
CREATE TABLE payment_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '订单ID (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  generation_id VARCHAR(36) NOT NULL COMMENT '关联的生成记录ID',
  out_trade_no VARCHAR(100) UNIQUE NOT NULL COMMENT '商户订单号',
  transaction_id VARCHAR(100) COMMENT '微信交易号',
  amount DECIMAL(10, 2) NOT NULL COMMENT '订单金额（元）',
  package_type ENUM('free', 'basic', 'premium') NOT NULL COMMENT '套餐类型',
  payment_method VARCHAR(50) DEFAULT 'wechat' COMMENT '支付方式',
  trade_type VARCHAR(20) DEFAULT 'JSAPI' COMMENT '支付类型',
  status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
  paid_at TIMESTAMP NULL COMMENT '支付完成时间',
  refund_reason TEXT COMMENT '退款原因',
  remark TEXT COMMENT '备注',
  _openid VARCHAR(100) COMMENT '支付用户OpenID（冗余字段）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_out_trade_no (out_trade_no),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  INDEX idx_trade_type (trade_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付订单表';
```

**字段说明：**

- `id`: 订单唯一标识，格式 `order-{timestamp}-{random}`
- `out_trade_no`: 商户订单号，格式 `{timestamp}{5位随机数}`，用于微信支付查询
- `transaction_id`: 微信交易号，支付成功后由回调更新
- `amount`: 订单金额（元），存储格式如 `0.01`, `29.90`
- `trade_type`: 支付类型
  - `JSAPI`: 小程序支付（默认）
  - `NATIVE`: PC 扫码支付
  - `H5`: H5 支付
  - `APP`: APP 支付
- `status`: 订单状态
  - `pending`: 待支付（初始状态）
  - `paid`: 已支付
  - `failed`: 支付失败
  - `refunded`: 已退款
- `_openid`: 冗余字段，用于快速查询用户订单

**云函数操作：**
- 创建订单（下单时）
- 更新订单状态（支付回调时）
- 查询订单（通过 out_trade_no）

**后端操作：**
- 查询订单列表
- 更新订单备注
- 处理退款
- 导出订单数据

### 3. refunds 表

退款记录表

```sql
CREATE TABLE refunds (
  id VARCHAR(36) PRIMARY KEY COMMENT '退款ID (UUID)',
  out_refund_no VARCHAR(100) UNIQUE NOT NULL COMMENT '商户退款单号',
  refund_id VARCHAR(100) COMMENT '微信退款单号',
  out_trade_no VARCHAR(100) NOT NULL COMMENT '原订单号',
  transaction_id VARCHAR(100) COMMENT '微信交易号',
  refund_amount DECIMAL(10, 2) NOT NULL COMMENT '退款金额（元）',
  total_amount DECIMAL(10, 2) NOT NULL COMMENT '订单总金额（元）',
  status ENUM('pending', 'success', 'closed', 'abnormal') DEFAULT 'pending' COMMENT '退款状态',
  reason TEXT COMMENT '退款原因',
  refunded_at TIMESTAMP NULL COMMENT '退款完成时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_out_refund_no (out_refund_no),
  INDEX idx_out_trade_no (out_trade_no),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款记录表';
```

**字段说明：**

- `out_refund_no`: 商户退款单号，唯一标识
- `refund_id`: 微信退款单号，退款成功后由回调更新
- `status`: 退款状态
  - `pending`: 退款中
  - `success`: 退款成功
  - `closed`: 退款关闭
  - `abnormal`: 退款异常

**云函数操作：**
- 创建退款记录
- 更新退款状态（退款回调时）

**后端操作：**
- 发起退款申请
- 查询退款状态
- 退款失败重试

### 4. payment_logs 表

支付日志表（用于审计和调试）

```sql
CREATE TABLE payment_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID (UUID)',
  type VARCHAR(50) NOT NULL COMMENT '日志类型',
  out_trade_no VARCHAR(100) COMMENT '商户订单号',
  out_refund_no VARCHAR(100) COMMENT '商户退款单号',
  event_type VARCHAR(50) COMMENT '事件类型',
  amount_total INT COMMENT '金额（分）',
  request_data JSON COMMENT '请求数据',
  response_data JSON COMMENT '响应数据',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_out_trade_no (out_trade_no),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付日志表';
```

**日志类型：**
- `order_create`: 创建订单
- `payment_callback`: 支付回调
- `refund_create`: 创建退款
- `refund_callback`: 退款回调

---

## API 接口规范

### 基础信息

**Base URL**: 通过环境变量 `API_BASE_URL` 配置

```
开发环境: http://localhost:8080
生产环境: https://api.yourdomain.com
```

**认证方式**: 内部 API 使用 `X-Internal-Secret` 请求头

```http
X-Internal-Secret: {INTERNAL_API_SECRET}
```

### 1. 订单创建通知

**用途**: 数据库不可用时，云函数通过此接口通知后端订单创建

**接口**: `POST /api/payment/internal/order-created`

**请求头**:
```http
Content-Type: application/json
X-Internal-Secret: {INTERNAL_API_SECRET}
```

**请求体**:
```json
{
  "orderId": "order-1706345678901-abc123",
  "outTradeNo": "170634567890112345",
  "userId": "user-1706345678901-xyz789",
  "openid": "oABC123xyz456",
  "amount": 2990,
  "packageType": "premium",
  "tradeType": "JSAPI",
  "status": "pending",
  "reason": "db_unavailable",
  "dbError": "Connection timeout"
}
```

**字段说明**:
- `orderId`: 订单ID（可选，数据库不可用时可能为空）
- `outTradeNo`: 商户订单号（必需）
- `userId`: 用户ID
- `openid`: 微信OpenID
- `amount`: 订单金额（分）
- `packageType`: 套餐类型 `basic` | `premium`
- `tradeType`: 支付类型 `JSAPI` | `NATIVE`
- `status`: 订单状态，通常为 `pending`
- `reason`: 通知原因
  - `db_unavailable`: 数据库不可用
  - `db_insert_failed`: 数据库插入失败
  - `db_exception`: 数据库异常
- `dbError`: 数据库错误信息（可选）

**响应**:
```json
{
  "success": true,
  "message": "订单已备份",
  "orderId": "order-1706345678901-abc123"
}
```

**后端处理逻辑**:
1. 验证 `X-Internal-Secret`
2. 将订单信息存储到备份表或缓存
3. 定期同步到主数据库
4. 返回成功响应

### 2. 支付成功通知

**用途**: 支付成功后，云函数通知后端处理业务逻辑

**接口**: `POST /api/payment/internal/notify`

**请求头**:
```http
Content-Type: application/json
X-Internal-Secret: {INTERNAL_API_SECRET}
```

**请求体**:
```json
{
  "outTradeNo": "170634567890112345",
  "transactionId": "4200001234567890123456789012345",
  "status": "paid",
  "packageType": "premium",
  "generationId": "gen-1706345678901-def456",
  "openid": "oABC123xyz456"
}
```

**字段说明**:
- `outTradeNo`: 商户订单号（必需）
- `transactionId`: 微信交易号（必需）
- `status`: 订单状态，通常为 `paid`
- `packageType`: 套餐类型
- `generationId`: 关联的生成任务ID（可选）
- `openid`: 支付用户OpenID

**响应**:
```json
{
  "success": true,
  "message": "处理成功"
}
```

**后端处理逻辑**:
1. 验证 `X-Internal-Secret`
2. 查询订单信息（通过 `outTradeNo`）
3. 更新用户权益（`payment_status`, `regenerate_count`）
4. 触发业务逻辑（如解锁生成任务）
5. 发送支付成功通知（可选）
6. 返回成功响应

**注意事项**:
- 接口必须支持幂等性（重复调用不会重复处理）
- 即使数据库已更新订单状态，后端仍需处理业务逻辑
- 建议异步处理，快速返回响应

### 3. 价格配置查询

**用途**: 云函数获取当前有效的价格配置

**接口**: `GET /api/prices/current`

**请求头**:
```http
Content-Type: application/json
```

**响应**:
```json
{
  "success": true,
  "data": {
    "packages": {
      "basic": 0.01,
      "premium": 29.90
    },
    "effectiveAt": "2026-01-27T00:00:00Z",
    "updatedAt": "2026-01-26T10:30:00Z"
  }
}
```

**字段说明**:
- `packages.basic`: 尝鲜包价格（元）
- `packages.premium`: 尊享包价格（元）
- `effectiveAt`: 价格生效时间
- `updatedAt`: 价格更新时间

**云函数处理**:
- 缓存价格配置 5 分钟
- API 不可用时使用降级价格（basic: 0.01, premium: 29.90）

---

## 数据流转流程

### 流程 1: 小程序支付（JSAPI）

```
用户 → 小程序 → 云函数 → 微信支付 → 云函数 → 数据库
                    ↓                      ↓
                  后端API ←────────────── 支付回调
```

**详细步骤**:

1. **用户发起支付**
   - 小程序调用云函数 `wxpay_order`
   - 传入参数: `packageType`, `generationId`, `userId`

2. **云函数创建订单**
   - 从 API 获取价格配置（带降级）
   - 生成 `out_trade_no`
   - 调用微信支付 API 下单
   - 写入数据库 `payment_orders` 表
   - 数据库失败时调用 `/api/payment/internal/order-created`

3. **返回支付参数**
   - 返回 `timeStamp`, `nonceStr`, `packageVal`, `paySign`
   - 小程序调用 `wx.requestPayment` 发起支付

4. **微信支付回调**
   - 微信支付成功后回调云函数 `wxpay_order_callback`
   - 云函数更新订单状态为 `paid`
   - 记录 `transaction_id` 和 `paid_at`
   - 调用 `/api/payment/internal/notify` 通知后端

5. **后端处理业务**
   - 更新用户权益
   - 解锁生成任务
   - 发送通知

### 流程 2: PC 扫码支付（NATIVE）

```
用户 → Web前端 → 云函数 → 微信支付 → 返回二维码
                    ↓                      ↓
                  数据库              用户扫码支付
                    ↓                      ↓
                  后端API ←────────────── 支付回调
```

**详细步骤**:

1. **Web 前端发起支付**
   - 调用云函数 `wxpay_order`
   - 传入参数: `packageType`, `tradeType: 'NATIVE'`, `userId`

2. **云函数创建订单**
   - 生成 `out_trade_no`
   - 调用微信支付 Native API
   - 获取 `code_url`（二维码链接）
   - 写入数据库

3. **返回二维码**
   - 返回 `codeUrl`
   - 前端生成二维码展示给用户

4. **用户扫码支付**
   - 用户使用微信扫码
   - 完成支付

5. **支付回调**
   - 同 JSAPI 流程的步骤 4-5

### 流程 3: 退款处理

```
后端 → 云函数 → 微信支付 → 云函数 → 数据库
                              ↓
                          退款回调
                              ↓
                          更新订单
```

**详细步骤**:

1. **后端发起退款**
   - 调用云函数 `wxpay_refund`
   - 传入参数: `outTradeNo`, `refundAmount`, `reason`

2. **云函数处理退款**
   - 生成 `out_refund_no`
   - 调用微信支付退款 API
   - 写入 `refunds` 表

3. **微信退款回调**
   - 回调云函数 `wxpay_refund_callback`
   - 更新退款状态
   - 全额退款时更新订单状态为 `refunded`

4. **后端处理**
   - 监听数据库变化
   - 更新用户权益（如需要）

---

## 环境变量配置

### 云函数环境变量

在云函数配置中设置以下环境变量：

```bash
# 微信支付配置（必需）
WECHAT_APPID=wx1234567890abcdef
WECHAT_MCHID=1234567890
WECHAT_SERIAL_NO=1234567890ABCDEF1234567890ABCDEF12345678
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=your_apiv3_key_32_characters

# 微信支付公钥（可选，用于验证回调签名）
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----

# 回调地址（可选，不配置则使用 API_BASE_URL 生成）
WECHAT_NOTIFY_URL=https://api.yourdomain.com/api/payment/callback

# 后端 API 地址（必需）
API_BASE_URL=https://api.yourdomain.com

# 内部 API 密钥（必需）
INTERNAL_API_SECRET=your_internal_secret_key_here
```

### 后端环境变量

```bash
# 数据库配置
DB_HOST=sh-cynosdbmysql-grp-ei51puvy.sql.tencentcdb.com
DB_PORT=22319
DB_USER=art
DB_PASSWORD=artPW192026
DB_NAME=test-1g71tc7eb37627e2

# 内部 API 密钥（与云函数保持一致）
INTERNAL_API_SECRET=your_internal_secret_key_here
```

---

## 错误处理

### 云函数错误处理策略

1. **数据库不可用**
   - 跳过数据库操作
   - 调用后端 API 备份订单
   - 返回警告但不阻断支付流程

2. **微信支付 API 失败**
   - 返回错误信息给前端
   - 记录错误日志
   - 不创建订单记录

3. **后端 API 不可用**
   - 记录错误日志
   - 不阻断主流程
   - 后端可通过轮询数据库获取订单

### 后端错误处理策略

1. **订单重复通知**
   - 检查订单状态
   - 已处理则直接返回成功
   - 实现幂等性

2. **用户不存在**
   - 尝试创建用户
   - 创建失败则返回错误

3. **数据库异常**
   - 使用事务保证一致性
   - 失败时回滚
   - 记录错误日志

---

## 安全规范

### 1. 内部 API 认证

所有内部 API 必须验证 `X-Internal-Secret` 请求头：

```javascript
// 后端验证示例
const internalSecret = req.headers['x-internal-secret'];
if (internalSecret !== process.env.INTERNAL_API_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. 数据库访问控制

- 使用专用数据库用户
- 限制 IP 白名单
- 使用 SSL 连接

### 3. 敏感信息保护

- `openid` 字段仅用于支付，不对外暴露
- 私钥和密钥存储在环境变量中
- 日志中不记录完整的敏感信息

### 4. 支付回调验证

- 验证微信支付签名（如果配置了公钥）
- 验证订单金额
- 防止重复处理

---

## 附录

### A. 数据库连接信息

```
Host: sh-cynosdbmysql-grp-ei51puvy.sql.tencentcdb.com
Port: 22319
User: art
Password: artPW192026
Database: test-1g71tc7eb37627e2
```

### B. 套餐类型说明

| 套餐类型 | 价格 | 权益 |
|---------|------|------|
| `free` | 免费 | 标清+水印，最多2人，基础3个模板 |
| `basic` | 0.01元 | 高清无水印，4选1，最多5人，热门10个模板 |
| `premium` | 29.90元 | 超清4K，4选1，无限制，全部模板，微动态视频 |

### C. 订单状态流转

```
pending → paid → refunded
   ↓
 failed
```

- `pending`: 订单创建，等待支付
- `paid`: 支付成功
- `failed`: 支付失败（超时或取消）
- `refunded`: 已退款

### D. 常见问题

**Q: 数据库不可用时订单会丢失吗？**  
A: 不会。云函数会调用后端 API 备份订单，后端可以定期同步到主数据库。

**Q: 支付回调失败怎么办？**  
A: 后端可以通过轮询 `payment_orders` 表获取新订单，或者通过微信支付查询接口主动查询订单状态。

**Q: 如何测试支付流程？**  
A: 使用微信支付沙箱环境，或者使用 0.01 元的测试金额。

**Q: 价格配置如何更新？**  
A: 在后端管理系统中更新价格配置，云函数会自动获取最新价格（5分钟缓存）。

---

## 更新日志

### v1.0.0 (2026-01-27)

- ✅ 初始版本
- ✅ 完整的数据库表结构说明
- ✅ API 接口规范
- ✅ 数据流转流程
- ✅ 环境变量配置
- ✅ 错误处理策略
- ✅ 安全规范

---

**文档维护**: 开发团队  
**联系方式**: dev@yourdomain.com
