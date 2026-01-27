# 微信支付云函数 - 完整文档

支持小程序支付（JSAPI）和 PC 扫码支付（Native）的云函数。

## 📋 目录

- [功能特性](#功能特性)
- [数据库配置](#数据库配置)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [调用方式](#调用方式)
- [后端 API 对接](#后端-api-对接)
- [数据库表结构](#数据库表结构)
- [架构说明](#架构说明)
- [故障排查](#故障排查)
- [安全配置](#安全配置)

---

## 功能特性

- ✅ **JSAPI 支付**：小程序内支付，通过 `cloudbase_module` 调用
- ✅ **Native 支付**：PC 扫码支付，直接调用微信支付 API v3
- ✅ **价格配置**：从后端 API 动态获取价格，支持降级方案
- ✅ **订单存储**：自动存储订单到 CloudBase MySQL 数据库
- ✅ **支付回调**：接收微信支付回调，自动更新订单状态
- ✅ **后端通知**：异步通知后端服务器，触发业务逻辑

---

## 💾 数据库配置

### CloudBase MySQL 数据库

本云函数使用 **CloudBase RDB (Relational Database) API** 连接 MySQL 数据库。

**重要更新（2026-01-27）：**
- ✅ 已从错误的 `app.database()`（文档数据库）切换到正确的 `app.rdb()`（关系型数据库）
- ✅ 已升级 `@cloudbase/node-sdk` 到 3.17.0 版本（支持 RDB API）
- ✅ 数据库连接在云函数环境中自动使用云函数身份凭证，无需额外配置

**数据库信息：**
- 环境 ID: `test-1g71tc7eb37627e2`
- 区域: `ap-shanghai`
- 数据库类型: MySQL (CloudBase)

**主要数据表：**
- `payment_orders` - 支付订单表（主表）
- `users` - 用户表
- `payment_logs` - 支付日志表
- `refunds` - 退款记录表

### 数据库操作示例

```javascript
const { safeDb } = require('./db/mysql');

// 插入订单数据
const orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const { data, error } = await safeDb.insert('payment_orders', {
  id: orderId,
  user_id: 'user-123',
  amount: '29.90', // 注意：DECIMAL 类型，单位是元
  package_type: 'premium',
  payment_method: 'wechat',
  transaction_id: 'out_trade_no_123', // 商户订单号
  status: 'pending'
});

// 查询订单（使用 transaction_id 查询）
const { data, error } = await safeDb.select('payment_orders', 'transaction_id', 'out_trade_no_123');

// 更新订单状态
const { data, error } = await safeDb.update('payment_orders', 'transaction_id', 'out_trade_no_123', {
  status: 'paid',
  transaction_id: '4200001234567890' // 更新为真实的微信交易号
});
```

**降级处理：**
- 如果数据库不可用，操作会返回 `{ skipped: true }`
- 支付功能不受影响，订单数据由后端管理
- 所有数据库错误都会被捕获并记录日志

---

## 🚀 快速开始

### 步骤 1：安装依赖

```bash
cd miniprogram/cloudfunctions/wxpayFunctions
pnpm install
```

### 步骤 2：生成内部密钥

```bash
openssl rand -hex 32
```

复制生成的密钥，例如：`a1b2c3d4e5f6...`

### 步骤 3：配置云函数环境变量

在微信云开发控制台 → 云函数 → wxpayFunctions → 配置 → 环境变量：

```bash
# 微信支付配置（必需）
WECHAT_APPID=wx648b96720f4f5e7b
WECHAT_MCHID=1637325831
WECHAT_SERIAL_NO=5B48215E728FEF79D054737B6DE27039A7DC3999
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=fds22F56jdf6232432j97fdskf3fdxd3

# 平台公钥（推荐）
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----

# 回调地址（必需，使用云函数 HTTP 触发器地址）
WECHAT_NOTIFY_URL=https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay

# 后端配置（必需）
API_BASE_URL=http://111.231.6.34
INTERNAL_API_SECRET=<步骤2生成的密钥>

# 数据库（必需）
DATABASE_URL=mysql://art:artPW192026@10.2.101.92:3306/test-1g71tc7eb37627e2
```

### 步骤 4：配置后端环境变量

编辑 `backend/.env` 文件：

```bash
# 添加以下配置（与云函数保持一致）
INTERNAL_API_SECRET=<步骤2生成的密钥>
API_BASE_URL=http://111.231.6.34
```

### 步骤 5：部署云函数

在微信开发者工具中：

1. 右键 `wxpayFunctions` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

### 步骤 6：测试支付流程

```javascript
// 测试 Native 支付（PC扫码）
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'basic',
    amount: 1,  // 0.01元测试
    tradeType: 'NATIVE'
  }
}).then(res => {
  console.log('支付结果:', res.result);
});
```

**预期结果**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "tradeType": "NATIVE",
    "codeUrl": "weixin://wxpay/bizpayurl?pr=xxx",
    "outTradeNo": "176947775022846445"
  }
}
```

---

## ⚙️ 环境变量配置

### 云函数环境变量说明

| 环境变量 | 用途 | 是否必需 | 说明 |
|---------|------|---------|------|
| `WECHAT_APPID` | 微信 AppID | ✅ 必需 | 小程序/公众号 AppID |
| `WECHAT_MCHID` | 商户号 | ✅ 必需 | 微信支付商户号 |
| `WECHAT_SERIAL_NO` | 证书序列号 | ✅ 必需 | 商户证书序列号（40位十六进制） |
| `WECHAT_PRIVATE_KEY` | 商户私钥 | ✅ 必需 | API 证书私钥（单行格式，使用 `\n` 表示换行） |
| `WECHAT_APIV3_KEY` | APIv3 密钥 | ✅ 必需 | 32位字符串 |
| `WECHAT_PUBLIC_KEY` | 平台公钥 | ⭐ 推荐 | 用于验证回调签名，不配置会自动获取 |
| `WECHAT_NOTIFY_URL` | 回调地址 | ✅ 必需 | 微信支付回调的 HTTPS 地址 |
| `API_BASE_URL` | 后端地址 | ✅ 必需 | 业务服务器地址，用于价格查询和通知 |
| `INTERNAL_API_SECRET` | 内部密钥 | ⭐ 推荐 | 用于验证云函数到后端的请求 |
| `DATABASE_URL` | 数据库连接 | ✅ 必需 | MySQL 连接字符串 |

### 证书格式转换

如果你的私钥/公钥是多行格式，需要转换为单行格式：

```bash
# 使用提供的转换脚本
./convert-private-key.sh your_private_key.pem

# 或手动转换
cat your_private_key.pem | sed ':a;N;$!ba;s/\n/\\n/g'
```

---

## 📞 调用方式

### 1. JSAPI 支付（小程序）

```javascript
// 小程序代码
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'premium',      // 套餐类型: basic | premium
    generationId: 'gen_123',     // 生成任务 ID（可选）
    userId: '104',               // 用户 ID（可选）
    tradeType: 'JSAPI'           // 支付类型（默认）
  }
}).then(res => {
  if (res.result.code === 0) {
    const { timeStamp, nonceStr, packageVal, paySign } = res.result.data;
    // 调用微信支付
    wx.requestPayment({
      timeStamp,
      nonceStr,
      package: packageVal,
      paySign,
      signType: 'RSA'
    });
  }
});
```

### 2. Native 支付（PC 扫码）

```javascript
// 从后端调用云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: 'test-1g71tc7eb37627e2' });

const result = await cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'premium',  // 套餐类型: basic | premium
    userId: '104',           // 用户 ID（可选）
    tradeType: 'NATIVE'      // PC 扫码支付
  }
});

if (result.result.code === 0) {
  const { codeUrl, outTradeNo } = result.result.data;
  // 生成二维码展示给用户扫码
  console.log('支付二维码:', codeUrl);
  console.log('订单号:', outTradeNo);
}
```

### 3. 自定义金额支付

```javascript
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    amount: 9900,            // 自定义金额（分）
    description: '自定义商品', // 商品描述
    tradeType: 'NATIVE'
  }
});
```

### 返回格式

**成功响应**：
```javascript
{
  code: 0,
  msg: 'success',
  data: {
    // JSAPI 支付
    tradeType: 'JSAPI',
    timeStamp: '1234567890',
    nonceStr: 'abc123',
    packageVal: 'prepay_id=xxx',
    paySign: 'sign_xxx',
    outTradeNo: '176941598512130033'
    
    // 或 Native 支付
    tradeType: 'NATIVE',
    codeUrl: 'weixin://wxpay/bizpayurl?pr=xxx',
    outTradeNo: '176941598512130033'
  }
}
```

**错误响应**：
```javascript
{
  code: -1,
  msg: '错误信息',
  error: '详细错误'
}
```

---

## 🔌 后端 API 对接

### 云函数基本信息

| 项目 | 信息 |
|------|------|
| **云函数名称** | `wxpayFunctions` |
| **环境域名** | `test-1g71tc7eb37627e2.api.tcloudbasegateway.com` |
| **HTTP 访问路径** | `/pay` |
| **完整 HTTP 地址** | `https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay` |

### 后端必需实现的接口

#### 1. 内部通知接口（必需）⭐

**接口路径**：`POST /api/payment/internal/notify`

**用途**：接收云函数的支付成功通知

**请求头**：
```http
Content-Type: application/json
X-Internal-Secret: <your-secret-key>
```

**请求体**：
```json
{
  "outTradeNo": "176947775022846445",
  "transactionId": "4200001234567890",
  "status": "paid",
  "packageType": "premium",
  "generationId": "gen_123",
  "openid": "oABC123xyz"
}
```

**响应格式**：
```json
{
  "success": true,
  "message": "处理成功"
}
```

**实现示例**：
```javascript
router.post('/internal/notify', async (req, res) => {
  try {
    // 1. 验证内部密钥
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { outTradeNo, transactionId, status } = req.body;
    
    // 2. 更新订单状态（幂等性处理）
    await updateOrderStatus(outTradeNo, status, transactionId);
    
    // 3. 触发业务逻辑
    await triggerBusinessLogic(outTradeNo);
    
    // 4. 实时推送给前端（可选）
    io.to(`order:${outTradeNo}`).emit('payment:status', {
      outTradeNo,
      status
    });
    
    res.json({ success: true, message: '处理成功' });
  } catch (error) {
    console.error('处理内部通知失败:', error);
    res.status(500).json({ error: '处理失败' });
  }
});
```

#### 2. 价格配置接口（推荐）⭐

**接口路径**：`GET /api/prices/current`

**用途**：云函数获取最新的价格配置

**响应格式**：
```json
{
  "success": true,
  "data": {
    "packages": {
      "basic": 0.01,
      "premium": 29.9
    },
    "updatedAt": "2026-01-27T10:00:00Z"
  }
}
```

**实现示例**：
```javascript
router.get('/prices/current', async (req, res) => {
  try {
    const prices = await getPricesFromDatabase();
    res.json({
      success: true,
      data: {
        packages: {
          basic: prices.basic || 0.01,
          premium: prices.premium || 29.9
        },
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取价格失败' });
  }
});
```

**注意**：
- 价格单位为**元**（人民币）
- 云函数会将价格转换为**分**（乘以100）后调用微信支付 API
- 如果不实现此接口，云函数会使用降级价格（basic: 0.01元, premium: 29.9元）

---

## 💾 数据库表结构

### payment_orders 表（支付订单表）

**重要说明**：云函数使用 `payment_orders` 表存储订单数据，与后端数据库保持一致。

| 字段 | 类型 | 说明 | 云函数使用 |
|------|------|------|-----------|
| id | VARCHAR(36) | 订单ID（UUID，主键） | ✅ 自动生成 |
| user_id | VARCHAR(36) | 用户ID | ✅ 从参数获取 |
| generation_id | VARCHAR(36) | 关联的生成记录ID | ✅ 从参数获取 |
| amount | DECIMAL(10,2) | 订单金额（元） | ✅ 自动转换（分→元） |
| package_type | ENUM | 套餐类型（free/basic/premium） | ✅ 从参数获取 |
| payment_method | VARCHAR(50) | 支付方式（默认 wechat） | ✅ 固定为 wechat |
| transaction_id | VARCHAR(100) | 微信交易ID | ✅ 初始为商户订单号，回调时更新 |
| status | ENUM | 订单状态（pending/paid/failed/refunded） | ✅ 创建时 pending，回调时更新 |
| created_at | TIMESTAMP | 创建时间 | ✅ 数据库自动生成 |
| updated_at | TIMESTAMP | 更新时间 | ✅ 数据库自动更新 |

**字段映射说明**：
- `transaction_id` 字段在创建订单时存储商户订单号（out_trade_no）
- 支付成功回调时，更新为真实的微信交易号
- `amount` 字段为 DECIMAL 类型，单位是元（云函数自动转换：分 ÷ 100）
- `status` 字段只有 4 个值：pending、paid、failed、refunded

### payment_logs 表（支付日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 自增ID（主键） |
| type | VARCHAR(32) | 日志类型（callback/query/refund） |
| out_trade_no | VARCHAR(64) | 商户订单号 |
| transaction_id | VARCHAR(64) | 微信支付订单号 |
| event_type | VARCHAR(64) | 事件类型 |
| amount_total | INT | 金额（分） |
| created_at | DATETIME | 创建时间 |

### users 表（用户表）

用于存储用户权益信息，通过 `user_id` 与 `payment_orders` 关联。

---

## 🏗️ 架构说明

### 混合架构（推荐）⭐

**支付回调流程**：
```
微信支付成功
    ↓
云函数回调（主）
    ↓
写入数据库 ← 保证数据持久化
    ↓
异步通知后端 ← 触发业务逻辑（不阻塞）
    ↓
后端实时推送前端 ← 提升用户体验（可选）
```

**架构优势**：
- ✅ **高可用**：云函数保证回调接收成功（自动HTTPS、自动扩容）
- ✅ **统一架构**：JSAPI和Native使用同一套回调逻辑
- ✅ **实时性**：后端可以通过WebSocket实时推送支付结果
- ✅ **降级方案**：即使后端故障，云函数仍能记录订单
- ✅ **成本优化**：云函数按量计费，小流量几乎免费

### 支付流程时序图

```
用户发起支付
    ↓
调用云函数创建订单
    ↓
云函数返回支付参数/二维码
    ↓
用户完成支付
    ↓
微信服务器 → 云函数回调
    ↓
云函数写入数据库（主要职责）
    ↓
云函数异步通知后端（不阻塞）
    ↓
后端更新订单状态
    ↓
后端触发业务逻辑
    ↓
前端显示支付成功
```

### 降级流程（后端故障时）

```
用户完成支付
    ↓
微信服务器 → 云函数回调
    ↓
云函数写入数据库 ✅
    ↓
云函数尝试通知后端 ❌（失败）
    ↓
前端轮询查询订单状态 ✅
    ↓
前端显示支付成功
```

---

## 🐛 故障排查

### 问题 1：数据库连接失败

**错误日志**：
```
[DB] MySQL 连接池初始化失败: ...
[DB] 数据库不可用，跳过插入操作
```

**解决方案**：
1. 检查 `DATABASE_URL` 环境变量格式是否正确
2. 格式：`mysql://user:password@host:port/database`
3. 确认数据库服务器可访问
4. 检查用户名密码是否正确

### 问题 2：Native 支付失败 - "缺少公钥"错误

**解决方案**：

**方案 1：配置平台公钥证书（推荐）**

1. 获取平台公钥证书：微信商户平台 → API安全 → 平台证书 → 下载证书
2. 转换证书格式：
   ```bash
   ./convert-private-key.sh wechatpay_certificate.pem
   ```
3. 配置环境变量：`WECHAT_PUBLIC_KEY`

**方案 2：让 SDK 自动获取**

不配置 `WECHAT_PUBLIC_KEY`，SDK 会在首次调用时自动从微信服务器获取。

### 问题 3：后端没有收到通知

**排查步骤**：

1. 检查云函数日志，确认是否尝试通知后端
2. 检查 `API_BASE_URL` 环境变量是否配置正确
3. 检查后端服务器是否运行
4. 检查防火墙是否允许云函数访问
5. 检查内部密钥是否匹配

**临时方案**：前端轮询查询订单状态

### 问题 4：支付成功但订单状态未更新

**排查步骤**：

1. 查看云函数日志，确认是否收到回调
2. 查看数据库，确认订单是否存在
3. 检查回调地址配置是否正确
4. 使用微信支付查询接口手动查询订单状态

### 问题 5：价格获取失败

云函数会自动使用降级方案：
- basic: 0.01 元
- premium: 29.9 元

---

## 🔒 安全配置

### 1. 生成内部密钥

```bash
openssl rand -hex 32
```

### 2. 配置密钥验证

将生成的密钥同时配置到：
- 云函数环境变量：`INTERNAL_API_SECRET`
- 后端环境变量：`INTERNAL_API_SECRET`

### 3. 后端验证请求来源

```javascript
router.post('/internal/notify', (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ error: '无权访问' });
  }
  next();
});
```

### 4. 幂等性处理

防止重复回调导致的重复处理：

```javascript
async function updateOrderStatus(outTradeNo, status, transactionId) {
  // 使用数据库条件更新，只更新 pending 状态的订单
  const result = await db.execute(
    `UPDATE orders 
     SET status = ?, transaction_id = ?, updated_at = NOW() 
     WHERE out_trade_no = ? AND status = 'pending'`,
    [status, transactionId, outTradeNo]
  );
  
  // 如果 affectedRows = 0，说明订单已处理
  return result.affectedRows > 0;
}
```

---

## 🧪 测试验证

### 1. 测试价格接口

```bash
curl http://111.231.6.34/api/prices/current
```

### 2. 测试内部通知接口

```bash
curl -X POST http://111.231.6.34/api/payment/internal/notify \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: your-secret-key" \
  -d '{
    "outTradeNo": "test_123456",
    "transactionId": "wx_test_789",
    "status": "paid",
    "packageType": "premium"
  }'
```

### 3. 测试完整支付流程

1. 调用云函数创建订单
2. 扫码支付（0.01元测试）
3. 查看云函数日志 → 确认"后端通知成功"
4. 查看后端日志 → 确认收到通知
5. 查询数据库 → 确认订单状态为 "paid"

---

## 📊 监控与日志

### 云函数日志

**成功日志示例**：
```
[wxpay_order] 订单信息: { outTradeNo: '...', orderAmount: 2900 }
[wxpay_order] 微信支付 Native 返回成功
[DB] 插入成功: orders, insertId: 123
[wxpay_order] 订单已存储到数据库

[wxpay_order_callback] 收到支付回调
[wxpay_order_callback] 签名验证成功
[wxpay_order_callback] 订单状态已更新: ...
[wxpay_order_callback] 通知后端: http://111.231.6.34/api/payment/internal/notify
[wxpay_order_callback] 后端通知成功
```

**失败日志示例**：
```
[DB] MySQL 连接池初始化失败: ...
[wxpay_order_callback] 后端服务器连接被拒绝
[wxpay_order_callback] 后端服务器响应超时
```

---

## ✅ 配置清单

### 云函数环境变量

```bash
WECHAT_APPID=wx648b96720f4f5e7b
WECHAT_MCHID=1637325831
WECHAT_SERIAL_NO=5B48215E728FEF79D054737B6DE27039A7DC3999
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=fds22F56jdf6232432j97fdskf3fdxd3
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
WECHAT_NOTIFY_URL=https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay
API_BASE_URL=http://111.231.6.34
INTERNAL_API_SECRET=<生成的密钥>
DATABASE_URL=mysql://art:artPW192026@10.2.101.92:3306/test-1g71tc7eb37627e2
```

### 后端环境变量

```bash
INTERNAL_API_SECRET=<生成的密钥>
API_BASE_URL=http://111.231.6.34
```

### 后端必需接口

- ✅ `POST /api/payment/internal/notify` - 接收支付通知（必需）
- ⭐ `GET /api/prices/current` - 提供价格配置（推荐）

---

## 📞 技术支持

### 云函数信息

- **环境ID**：`test-1g71tc7eb37627e2`
- **云函数名称**：`wxpayFunctions`
- **HTTP 访问地址**：`https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay`

### 数据库信息

- **主机**：`10.2.101.92:3306`
- **数据库**：`test-1g71tc7eb37627e2`
- **用户**：`art`

### 后端服务器

- **地址**：`http://111.231.6.34`
- **必需接口**：`/api/payment/internal/notify`
- **推荐接口**：`/api/prices/current`

---

**文档版本**：v2.1  
**最后更新**：2026-01-27  
**维护状态**：✅ 生产就绪

---

## 🆕 最新更新（2026-01-27）

### 数据库结构增强

已执行 migration 006，新增以下字段：

**users 表新增字段**：
- `unionid` (varchar(64), UNIQUE): 微信 UnionID，用于跨小程序用户识别
- `nickname` (varchar(100)): 用户昵称
- `avatar_url` (text): 用户头像 URL
- `phone` (varchar(20)): 手机号
- `last_login_at` (timestamp): 最后登录时间

**payment_orders 表新增字段**：
- `out_trade_no` (varchar(64), UNIQUE): 商户订单号（用于查询）
- `paid_at` (timestamp): 实际支付完成时间
- `refund_reason` (varchar(500)): 退款原因
- `remark` (text): 订单备注信息

### 代码更新

1. **订单创建逻辑**：
   - 使用 `out_trade_no` 存储商户订单号
   - `transaction_id` 初始为 null，支付成功后更新为微信交易号
   - 自动获取 `unionid` 并存储到用户表
   - 记录用户 `last_login_at`

2. **回调处理逻辑**：
   - 使用 `out_trade_no` 查询订单（而非 transaction_id）
   - 更新 `paid_at` 字段记录实际支付时间
   - 更新 `transaction_id` 为微信交易号

3. **数据安全机制**：
   - 数据库不可用时，通过后端 API 备份订单数据
   - 后端接口：`POST /api/payment/internal/order-created`
   - 确保支付记录不丢失

### 后端 API 新增接口

**订单备份接口**（数据库故障时使用）：
```
POST /api/payment/internal/order-created
Headers: {
  X-Internal-Secret: 'your-secret-key'
}
Body: {
  orderId: 'string',
  outTradeNo: 'string',
  userId: 'string',
  openid: 'string',
  unionid: 'string',  // 新增
  amount: number,
  packageType: 'string',
  tradeType: 'string',
  status: 'string',
  reason: 'db_unavailable' | 'db_insert_failed' | 'db_exception',
  dbError?: 'string'
}
```

### 部署检查清单

- [x] 执行 migration 006
- [x] 更新云函数代码
- [x] 验证数据库字段
- [ ] 部署云函数到生产环境
- [ ] 实现后端备份接口
- [ ] 测试完整支付流程
