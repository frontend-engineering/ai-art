# 微信支付云函数 - 后端 API 对接文档

## 📋 概述

本文档说明如何将业务服务器与微信支付云函数集成，实现混合架构方案C。

**架构流程**：
```
微信支付成功 → 云函数回调 → 写入数据库 → 异步通知后端 → 后端处理业务逻辑
```

**适用场景**：
- 多个业务系统共享同一个支付云函数
- 需要实时接收支付通知
- 需要在支付成功后触发复杂业务逻辑

---

## 🌐 云函数基本信息

### 云函数环境信息

| 项目 | 信息 |
|------|------|
| **云函数名称** | `wxpayFunctions` |
| **环境域名** | `test-1g71tc7eb37627e2.api.tcloudbasegateway.com` |
| **HTTP 访问路径** | `/pay` |
| **完整 HTTP 地址** | `https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay` |
| **支持协议** | HTTPS |
| **调用方式** | 云函数调用 / HTTP 触发器 |

### 云函数功能列表

| 功能 | type 参数 | 说明 |
|------|-----------|------|
| 创建支付订单 | `wxpay_order` | 支持 JSAPI 和 Native 支付 |
| 支付回调 | `wxpay_order_callback` | 接收微信支付回调（HTTP 触发器） |
| 查询订单（商户订单号） | `wxpay_query_order_by_out_trade_no` | 根据商户订单号查询 |
| 查询订单（微信订单号） | `wxpay_query_order_by_transaction_id` | 根据微信交易号查询 |
| 申请退款 | `wxpay_refund` | 发起退款申请 |
| 查询退款 | `wxpay_refund_query` | 查询退款状态 |
| 退款回调 | `wxpay_refund_callback` | 接收退款回调 |

---

---

## � 云函数环境变量配置

### 必需配置

云函数需要配置以下环境变量才能正常工作：

```bash
# 微信支付配置（必需）
WECHAT_APPID=wx648b96720f4f5e7b
WECHAT_MCHID=1637325831
WECHAT_SERIAL_NO=5B48215E728FEF79D054737B6DE27039A7DC3999
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=fds22F56jdf6232432j97fdskf3fdxd3

# 微信支付回调地址（必需）
# 使用云函数 HTTP 触发器地址
WECHAT_NOTIFY_URL=https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay

# 后端 API 配置（必需）
# 云函数会调用此地址的接口
API_BASE_URL=http://111.231.6.34

# 数据库配置（必需）
DATABASE_URL=mysql://art:artPW192026@10.2.101.92:3306/test-1g71tc7eb37627e2
```

### 推荐配置

```bash
# 微信支付平台公钥（推荐，用于验证回调签名）
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----

# 内部 API 密钥（推荐，用于验证云函数到后端的请求）
INTERNAL_API_SECRET=your-secret-key-here
```

### 配置说明

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

---

## 📡 调用云函数

### 方式 1：从小程序调用（JSAPI 支付）

```javascript
// 小程序代码
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'premium',      // 套餐类型
    generationId: 'gen_123',     // 业务ID（可选）
    userId: '104',               // 用户ID（可选）
    tradeType: 'JSAPI'           // 支付类型
  }
}).then(res => {
  if (res.result.code === 0) {
    const { timeStamp, nonceStr, packageVal, paySign } = res.result.data;
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

### 方式 2：从后端调用（Native 支付）

**后端需要安装微信云开发 SDK**：

```bash
npm install wx-server-sdk
# 或
pnpm add wx-server-sdk
```

**后端代码示例**：

```javascript
const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: 'test-1g71tc7eb37627e2'  // 你的环境ID
});

// 创建 Native 支付订单
async function createNativePayment(req, res) {
  try {
    const { packageType, userId, businessId } = req.body;
    
    const result = await cloud.callFunction({
      name: 'wxpayFunctions',
      data: {
        type: 'wxpay_order',
        packageType,           // basic 或 premium
        userId,                // 用户ID
        businessId,            // 业务订单ID
        tradeType: 'NATIVE'    // PC 扫码支付
      }
    });
    
    if (result.result.code === 0) {
      const { codeUrl, outTradeNo } = result.result.data;
      
      // 返回二维码给前端
      res.json({
        success: true,
        data: {
          codeUrl,           // 二维码链接
          orderId: outTradeNo // 商户订单号
        }
      });
    } else {
      res.status(500).json({
        error: result.result.msg
      });
    }
  } catch (error) {
    console.error('创建支付失败:', error);
    res.status(500).json({ error: '创建支付失败' });
  }
}
```

### 方式 3：通过 HTTP API 调用

**请求地址**：
```
POST https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/v1/functions/wxpayFunctions
```

**请求头**：
```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**请求体**：
```json
{
  "type": "wxpay_order",
  "packageType": "premium",
  "userId": "104",
  "tradeType": "NATIVE"
}
```

**注意**：需要先获取云开发的 access_token。

---

## 🔌 后端需要实现的接口

### 1. 内部通知接口（必需）⭐

**接口路径**：`POST /api/payment/internal/notify`

**用途**：接收云函数的支付成功通知

**云函数配置**：
- 环境变量：`API_BASE_URL=http://111.231.6.34`
- 完整调用地址：`http://111.231.6.34/api/payment/internal/notify`
- 超时时间：5秒
- 重试策略：不重试（失败不影响订单记录）

**请求头**：
```http
Content-Type: application/json
X-Internal-Secret: <your-secret-key>  # 可选，用于验证请求来源
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

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| outTradeNo | string | 商户订单号 |
| transactionId | string | 微信支付订单号 |
| status | string | 订单状态，固定为 "paid" |
| packageType | string | 套餐类型（basic/premium） |
| generationId | string | 生成任务ID（可选） |
| openid | string | 用户openid（可选） |

**响应格式**：
```json
{
  "success": true,
  "message": "处理成功"
}
```

**错误响应**：
```json
{
  "error": "错误信息",
  "message": "详细描述"
}
```

**实现示例（Node.js/Express）**：
```javascript
router.post('/internal/notify', async (req, res) => {
  try {
    // 1. 验证内部密钥（可选）
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret) {
      const requestSecret = req.headers['x-internal-secret'];
      if (requestSecret !== internalSecret) {
        return res.status(403).json({ error: '无权访问' });
      }
    }
    
    const { outTradeNo, transactionId, status, packageType } = req.body;

    
    // 2. 更新订单状态（幂等性处理）
    await updateOrderStatus(outTradeNo, status, transactionId);
    
    // 3. 触发业务逻辑
    await triggerBusinessLogic(outTradeNo, packageType);
    
    // 4. 实时推送给前端（可选）
    io.to(`order:${outTradeNo}`).emit('payment:status', {
      outTradeNo,
      status,
      timestamp: Date.now()
    });
    
    res.json({ success: true, message: '处理成功' });
  } catch (error) {
    console.error('处理内部通知失败:', error);
    res.status(500).json({ error: '处理失败', message: error.message });
  }
});
```

---

### 2. 价格配置接口（推荐）⭐

**接口路径**：`GET /api/prices/current`

**用途**：云函数获取最新的价格配置

**云函数配置**：
- 环境变量：`API_BASE_URL=http://111.231.6.34`
- 完整调用地址：`http://111.231.6.34/api/prices/current`
- 超时时间：5秒
- 缓存时间：5分钟（云函数会缓存价格，减少请求）
- 降级方案：如果接口失败，使用内置价格（basic: 0.01元, premium: 29.9元）

**请求头**：
```http
Accept: application/json
```

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

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 请求是否成功 |
| data.packages.basic | number | 基础套餐价格（元） |
| data.packages.premium | number | 高级套餐价格（元） |
| data.updatedAt | string | 价格更新时间（ISO 8601格式） |

**实现示例（Node.js/Express）**：
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
    console.error('获取价格失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取价格失败' 
    });
  }
});
```

**注意事项**：
- ✅ 价格单位为**元**（人民币）
- ✅ 云函数会将价格转换为**分**（乘以100）后调用微信支付 API
- ✅ 如果不实现此接口，云函数会使用降级价格方案
- ✅ 建议实现此接口以支持动态价格调整

---

### 3. 订单查询接口（可选）

**接口路径**：`GET /api/payment/order/:orderId`

**用途**：前端轮询查询订单状态（降级方案）

**请求参数**：

| 参数 | 位置 | 类型 | 说明 |
|------|------|------|------|
| orderId | path | string | 商户订单号（out_trade_no） |

**响应格式**：
```json
{
  "success": true,
  "data": {
    "orderId": "176947775022846445",
    "status": "paid",
    "amount": 2990,
    "packageType": "premium",
    "transactionId": "4200001234567890",
    "createdAt": "2026-01-27T10:00:00Z",
    "paidAt": "2026-01-27T10:05:00Z"
  }
}
```

---

## 🔧 环境变量配置

### 云函数环境变量

在微信云开发控制台配置：

```bash
# 必需配置
WECHAT_APPID=wx648b96720f4f5e7b
WECHAT_MCHID=1637325831
WECHAT_SERIAL_NO=5B48215E728FEF79D054737B6DE27039A7DC3999
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=fds22F56jdf6232432j97fdskf3fdxd3

# 推荐配置
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----

# 回调地址（使用云函数 HTTP 触发器地址）
WECHAT_NOTIFY_URL=https://xxx.service.tcloudbase.com/wxpay_order_callback

# 后端 API 配置（重要！）
API_BASE_URL=http://111.231.6.34
INTERNAL_API_SECRET=your-secret-key-here

# 数据库连接
DATABASE_URL=mysql://art:artPW192026@10.2.101.92:3306/test-1g71tc7eb37627e2
```


### 后端环境变量

在 `backend/.env` 文件中添加：

```bash
# 内部 API 密钥（与云函数保持一致）
INTERNAL_API_SECRET=your-secret-key-here

# API 基础 URL
API_BASE_URL=http://111.231.6.34
```

**生成密钥**：
```bash
openssl rand -hex 32
```

---

## 📡 调用云函数

### 场景 1：小程序内支付（JSAPI）

```javascript
// 小程序代码
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'premium',
    generationId: 'gen_123',
    userId: '104',
    tradeType: 'JSAPI'
  }
}).then(res => {
  if (res.result.code === 0) {
    const { timeStamp, nonceStr, packageVal, paySign } = res.result.data;
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

### 场景 2：PC 扫码支付（Native）

```javascript
// 后端调用云函数
const cloud = require('wx-server-sdk');
cloud.init();

const result = await cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'premium',
    userId: '104',
    tradeType: 'NATIVE'
  }
});

if (result.result.code === 0) {
  const { codeUrl, outTradeNo } = result.result.data;
  // 返回二维码给前端
  res.json({ codeUrl, orderId: outTradeNo });
}
```


### 场景 3：Web 端调用（通过后端代理）

```javascript
// 前端调用后端 API
fetch('/api/payment/create-native', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    packageType: 'premium',
    userId: '104'
  })
}).then(res => res.json())
  .then(data => {
    // 显示二维码
    showQRCode(data.codeUrl);
    // 开始轮询订单状态
    pollOrderStatus(data.orderId);
  });

// 后端 API 实现
router.post('/create-native', async (req, res) => {
  const { packageType, userId } = req.body;
  
  // 调用云函数
  const result = await cloud.callFunction({
    name: 'wxpayFunctions',
    data: {
      type: 'wxpay_order',
      packageType,
      userId,
      tradeType: 'NATIVE'
    }
  });
  
  if (result.result.code === 0) {
    res.json(result.result.data);
  } else {
    res.status(500).json({ error: result.result.msg });
  }
});
```

---

## 🔄 支付流程时序图

### 完整流程

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
后端推送给前端（WebSocket/SSE）
    ↓
前端显示支付成功
```


### 降级流程（后端故障时）

```
用户发起支付
    ↓
调用云函数创建订单
    ↓
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

**说明**：即使后端服务故障，云函数仍能保证订单记录到数据库，前端可以通过轮询获取订单状态。

---

## 💡 多业务复用方案

### 方案 1：通过业务标识区分

**云函数调用时传入业务标识**：

```javascript
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'premium',
    businessType: 'ai-photo',  // 业务标识
    businessId: 'biz_123',     // 业务订单ID
    tradeType: 'NATIVE'
  }
});
```

**后端根据业务标识路由**：

```javascript
router.post('/internal/notify', async (req, res) => {
  const { businessType, businessId, outTradeNo, status } = req.body;
  
  // 根据业务类型路由到不同的处理器
  switch (businessType) {
    case 'ai-photo':
      await handleAIPhotoPayment(businessId, outTradeNo, status);
      break;
    case 'video-generation':
      await handleVideoPayment(businessId, outTradeNo, status);
      break;
    default:
      await handleDefaultPayment(outTradeNo, status);
  }
  
  res.json({ success: true });
});
```


### 方案 2：多个后端服务器

**配置多个回调地址**：

云函数可以根据业务类型通知不同的后端服务器：

```javascript
// 云函数回调中的实现
async function notifyBackend(paymentData) {
  const { businessType } = paymentData;
  
  // 根据业务类型选择后端地址
  const backendUrls = {
    'ai-photo': 'http://111.231.6.34',
    'video-gen': 'http://222.111.5.45',
    'default': process.env.API_BASE_URL
  };
  
  const apiBaseUrl = backendUrls[businessType] || backendUrls.default;
  
  if (!apiBaseUrl) return;
  
  await axios.post(`${apiBaseUrl}/api/payment/internal/notify`, paymentData, {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET
    }
  });
}
```

**环境变量配置**：

```bash
# 主后端
API_BASE_URL=http://111.231.6.34

# 其他业务后端（可选）
API_BASE_URL_VIDEO=http://222.111.5.45
API_BASE_URL_PHOTO=http://111.231.6.34
```

---

## 🔒 安全建议

### 1. 内部密钥验证

**强烈建议**配置 `INTERNAL_API_SECRET` 以防止未授权访问：

```javascript
// 后端验证
if (req.headers['x-internal-secret'] !== process.env.INTERNAL_API_SECRET) {
  return res.status(403).json({ error: '无权访问' });
}
```

### 2. IP 白名单（可选）

限制只有云函数的 IP 可以访问内部接口：

```javascript
const ALLOWED_IPS = ['云函数IP段'];

router.post('/internal/notify', (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: 'IP not allowed' });
  }
  next();
});
```


### 3. 幂等性处理

防止重复回调导致的重复处理：

```javascript
async function updateOrderStatus(outTradeNo, status, transactionId) {
  // 使用数据库事务和条件更新
  const result = await db.execute(
    `UPDATE orders 
     SET status = ?, transaction_id = ?, updated_at = NOW() 
     WHERE out_trade_no = ? AND status = 'pending'`,
    [status, transactionId, outTradeNo]
  );
  
  // 如果 affectedRows = 0，说明订单已处理
  if (result.affectedRows === 0) {
    console.log('订单已处理，跳过');
    return false;
  }
  
  return true;
}
```

---

## 🧪 测试指南

### 1. 测试内部通知接口

```bash
# 使用 curl 测试
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

### 2. 测试价格接口

```bash
curl http://111.231.6.34/api/prices/current
```

### 3. 测试完整支付流程

```javascript
// 1. 创建订单
const order = await cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'basic',
    amount: 1,  // 0.01元测试
    tradeType: 'NATIVE'
  }
});

// 2. 使用微信开发者工具扫码支付

// 3. 查看云函数日志
// 4. 查看后端日志
// 5. 查询订单状态
```


---

## 📊 监控与日志

### 云函数日志

在微信云开发控制台查看：

**成功日志示例**：
```
[wxpay_order_callback] 收到支付回调
[wxpay_order_callback] 签名验证成功
[wxpay_order_callback] 处理订单: { outTradeNo: '...', transactionId: '...' }
[wxpay_order_callback] 订单状态已更新: ...
[wxpay_order_callback] 通知后端: http://111.231.6.34/api/payment/internal/notify
[wxpay_order_callback] 后端通知成功: { success: true }
```

**失败日志示例**：
```
[wxpay_order_callback] 后端服务器连接被拒绝，请检查服务器是否运行
[wxpay_order_callback] 后端服务器响应超时
```

### 后端日志

建议记录以下信息：

```javascript
// 记录所有内部通知
logger.info('收到云函数内部通知', {
  outTradeNo,
  transactionId,
  status,
  timestamp: new Date().toISOString()
});

// 记录处理结果
logger.info('订单处理完成', {
  outTradeNo,
  success: true,
  duration: Date.now() - startTime
});

// 记录错误
logger.error('订单处理失败', {
  outTradeNo,
  error: error.message,
  stack: error.stack
});
```

### 监控指标

建议监控以下指标：

1. **回调成功率**：云函数接收微信回调的成功率
2. **通知成功率**：云函数通知后端的成功率
3. **处理延迟**：从支付成功到后端处理完成的时间
4. **订单状态分布**：pending/paid/failed 的数量

---

## ❓ 常见问题

### Q1: 后端没有收到通知怎么办？

**排查步骤**：

1. 检查云函数日志，确认是否尝试通知后端
2. 检查 `API_BASE_URL` 环境变量是否配置正确
3. 检查后端服务器是否运行
4. 检查防火墙是否允许云函数访问
5. 检查内部密钥是否匹配

**临时方案**：前端轮询查询订单状态


### Q2: 如何处理重复回调？

**答**：云函数和后端都应该实现幂等性处理：

- 云函数：检查订单状态，已支付的订单不重复更新
- 后端：使用数据库条件更新，只更新 `status='pending'` 的订单

### Q3: 支付成功但订单状态未更新？

**排查步骤**：

1. 查看云函数日志，确认是否收到回调
2. 查看数据库，确认订单是否存在
3. 检查回调地址配置是否正确
4. 使用微信支付查询接口手动查询订单状态

### Q4: 如何支持多个业务系统？

**答**：参考"多业务复用方案"章节，可以通过：

1. 业务标识区分不同业务
2. 配置多个后端服务器地址
3. 在回调中根据业务类型路由到不同处理器

### Q5: 云函数通知后端超时怎么办？

**答**：

- 云函数设置了 5 秒超时，超时不影响订单记录
- 后端应该快速响应（< 3 秒），复杂业务逻辑异步处理
- 如果经常超时，考虑优化后端性能或使用消息队列

---

## 📚 相关文档

- [微信支付云函数 README](./README.md)
- [支付回调架构方案](../../PAYMENT_CALLBACK_ARCHITECTURE.md)
- [微信支付 API v3 文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)

---

## 🆘 技术支持

如有问题，请查看：

1. 云函数日志：微信云开发控制台 → 云函数 → 日志
2. 后端日志：检查应用日志文件
3. 数据库：检查 `orders` 表和 `payment_logs` 表

**联系方式**：[根据实际情况填写]

---

**最后更新**：2026-01-27


---

## 💾 数据库表结构

云函数会自动将订单信息存储到数据库，后端可以直接查询这些表。

### orders 表（订单表）

| 字段 | 类型 | 说明 |
|------|------|------|
| out_trade_no | VARCHAR(64) | 商户订单号（主键） |
| transaction_id | VARCHAR(64) | 微信支付订单号 |
| openid | VARCHAR(64) | 用户 openid |
| user_id | VARCHAR(64) | 业务用户ID（可选） |
| generation_id | VARCHAR(64) | 生成任务ID（可选） |
| package_type | VARCHAR(32) | 套餐类型（basic/premium） |
| amount | INT | 订单金额（分） |
| paid_amount | INT | 实际支付金额（分） |
| description | VARCHAR(255) | 订单描述 |
| trade_type | VARCHAR(16) | 支付类型（JSAPI/NATIVE） |
| status | VARCHAR(16) | 订单状态（pending/paid/failed） |
| paid_at | DATETIME | 支付时间 |
| created_at | DATETIME | 创建时间 |

### payment_logs 表（支付日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 自增ID（主键） |
| type | VARCHAR(32) | 日志类型（callback/query/refund） |
| out_trade_no | VARCHAR(64) | 商户订单号 |
| transaction_id | VARCHAR(64) | 微信支付订单号 |
| openid | VARCHAR(64) | 用户 openid |
| package_type | VARCHAR(32) | 套餐类型 |
| generation_id | VARCHAR(64) | 生成任务ID |
| event_type | VARCHAR(64) | 事件类型 |
| amount_total | INT | 金额（分） |
| created_at | DATETIME | 创建时间 |

**数据库连接信息**：
```
Host: 10.2.101.92
Port: 3306
Database: test-1g71tc7eb37627e2
User: art
Password: artPW192026
```

**注意**：后端可以直接查询这些表获取订单信息，无需等待云函数通知。

---

## 📋 完整配置清单

### 云函数环境变量（必需配置）

```bash
# 微信支付配置
WECHAT_APPID=wx648b96720f4f5e7b
WECHAT_MCHID=1637325831
WECHAT_SERIAL_NO=5B48215E728FEF79D054737B6DE27039A7DC3999
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=fds22F56jdf6232432j97fdskf3fdxd3
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----

# 回调地址
WECHAT_NOTIFY_URL=https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay

# 后端 API
API_BASE_URL=http://111.231.6.34
INTERNAL_API_SECRET=<生成的密钥>

# 数据库
DATABASE_URL=mysql://art:artPW192026@10.2.101.92:3306/test-1g71tc7eb37627e2
```

### 后端环境变量（必需配置）

```bash
# 内部 API 密钥（与云函数保持一致）
INTERNAL_API_SECRET=<生成的密钥>

# API 基础 URL
API_BASE_URL=http://111.231.6.34
```

### 后端必需实现的接口

| 接口 | 方法 | 路径 | 是否必需 | 说明 |
|------|------|------|---------|------|
| 内部通知 | POST | `/api/payment/internal/notify` | ✅ 必需 | 接收支付成功通知 |
| 价格配置 | GET | `/api/prices/current` | ⭐ 推荐 | 提供动态价格 |
| 订单查询 | GET | `/api/payment/order/:orderId` | ⏸️ 可选 | 前端轮询查询 |

---

## 🔐 安全配置建议

### 1. 生成内部密钥

```bash
# 使用 openssl 生成随机密钥
openssl rand -hex 32

# 输出示例
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. 配置密钥

将生成的密钥同时配置到：
- 云函数环境变量：`INTERNAL_API_SECRET`
- 后端环境变量：`INTERNAL_API_SECRET`

### 3. 验证请求来源

```javascript
// 后端验证代码
router.post('/internal/notify', (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ error: '无权访问' });
  }
  next();
});
```

---

## 🧪 测试验证

### 1. 测试价格接口

```bash
curl http://111.231.6.34/api/prices/current
```

**预期响应**：
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

**预期响应**：
```json
{
  "success": true,
  "message": "处理成功"
}
```

### 3. 测试完整支付流程

1. 调用云函数创建订单
2. 扫码支付（0.01元测试）
3. 查看云函数日志 → 确认"后端通知成功"
4. 查看后端日志 → 确认收到通知
5. 查询数据库 → 确认订单状态为 "paid"

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

**文档版本**：v1.0  
**最后更新**：2026-01-27  
**维护状态**：✅ 生产就绪
