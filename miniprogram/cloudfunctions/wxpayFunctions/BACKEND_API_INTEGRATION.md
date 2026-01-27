# 微信支付云函数 - 业务方对接文档

## 📋 文档说明

本文档面向业务后端开发者，说明如何与微信支付云函数集成。

**重要提示**：
- 云函数负责支付流程和数据持久化
- 后端负责业务逻辑处理
- 两个系统通过明确定义的接口通信

---

## 🏗️ 架构设计

### 完整支付流程

```
┌─────────────┐
│  用户发起   │
│    支付     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 1. 云函数创建订单 (wxpay_order)                         │
│    - 验证/创建用户                                       │
│    - 插入订单到数据库 (status: pending)                 │
│    - 调用微信支付 API                                    │
│    - 返回支付参数                                        │
│                                                          │
│    ⚠️ 如果数据库故障：                                   │
│    → 调用后端 /api/payment/internal/order-created       │
│       (订单备份，不需要 transactionId)                   │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  用户完成   │
│    支付     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 2. 微信回调云函数 (wxpay_order_callback)                │
│    - 验证签名                                            │
│    - 更新订单状态 (status: paid)                         │
│    - 更新 transaction_id (微信支付订单号)                │
│    - 更新 paid_at (支付时间)                             │
│                                                          │
│    ✅ 支付成功后：                                       │
│    → 调用后端 /api/payment/internal/notify              │
│       (包含 transactionId，触发业务逻辑)                 │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 3. 后端处理业务逻辑                                      │
│    - 更新订单状态（幂等性）                              │
│    - ⭐ 更新用户权益（升级等级）                         │
│    - 触发业务流程                                        │
│    - 实时推送前端（可选）                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 必需实现的接口

### 接口 1：订单备份接口（数据库故障时）

**用途**：当云函数数据库不可用时，接收订单备份

**时机**：订单创建时，如果云函数数据库写入失败

**接口路径**：`POST /api/payment/internal/order-created`

**请求头**：
```http
Content-Type: application/json
X-Internal-Secret: <your-secret-key>
```

**请求体**：
```json
{
  "orderId": "order-1769502049228-xxx",
  "outTradeNo": "176950204861001648",
  "userId": "101",
  "openid": "oABC123xyz",
  "unionid": "uABC123xyz",
  "amount": 2990,
  "packageType": "premium",
  "tradeType": "NATIVE",
  "status": "pending",
  "reason": "db_unavailable",
  "dbError": "Error 1452..."
}
```

**⚠️ 重要约束**：
- ❌ **不包含** `transactionId`（此时用户还未支付）
- ✅ `status` 固定为 `"pending"`
- ✅ `outTradeNo` 是商户订单号（用于后续查询）
- ✅ `amount` 单位是**分**

**响应格式**：
```json
{
  "success": true,
  "message": "订单已备份",
  "userId": "101"
}
```

**实现示例**：
```javascript
router.post('/internal/order-created', async (req, res) => {
  try {
    // 1. 验证内部密钥
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { 
      orderId, outTradeNo, userId, openid, unionid,
      amount, packageType, tradeType, status, 
      reason, dbError 
    } = req.body;
    
    // 2. 参数验证
    if (!outTradeNo) {
      return res.status(400).json({ 
        error: '缺少订单号', 
        message: '必须提供 outTradeNo' 
      });
    }
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({ 
        error: '缺少金额', 
        message: '必须提供 amount（单位：分）' 
      });
    }
    
    // 3. 确保用户存在（不存在则创建）
    let effectiveUserId = userId;
    if (!effectiveUserId && openid) {
      // 通过 openid 查找或创建用户
      const user = await findOrCreateUser(openid, unionid);
      effectiveUserId = user.id;
    } else if (!effectiveUserId) {
      // 创建临时用户
      effectiveUserId = await createTempUser();
    }
    
    // 4. 备份订单（使用 INSERT IGNORE 避免重复）
    await db.execute(
      `INSERT IGNORE INTO payment_orders 
       (id, user_id, generation_id, out_trade_no, amount, package_type, 
        payment_method, trade_type, status, _openid, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'wechat', ?, ?, ?, NOW(), NOW())`,
      [
        orderId || `order-${outTradeNo}`,
        effectiveUserId,
        effectiveUserId,
        outTradeNo,
        (amount / 100).toFixed(2),  // 转换为元
        packageType || 'basic',
        tradeType || 'JSAPI',
        status || 'pending',
        openid || ''
      ]
    );
    
    // 5. 记录错误日志
    console.error(`[PAYMENT_BACKUP] 云函数数据库故障: ${reason}`, {
      orderId, outTradeNo, dbError
    });
    
    res.json({ success: true, message: '订单已备份', userId: effectiveUserId });
  } catch (error) {
    console.error('[PAYMENT_BACKUP] 备份失败:', error);
    res.status(500).json({ error: '备份失败', message: error.message });
  }
});
```

---

### 接口 2：支付成功通知接口（业务逻辑触发）

**用途**：接收支付成功通知，触发业务逻辑

**时机**：用户支付成功后，云函数回调处理完成

**接口路径**：`POST /api/payment/internal/notify`

**请求头**：
```http
Content-Type: application/json
X-Internal-Secret: <your-secret-key>
```

**请求体**：
```json
{
  "outTradeNo": "176950204861001648",
  "transactionId": "4200001234567890",
  "status": "paid",
  "packageType": "premium",
  "generationId": "gen_123",
  "openid": "oABC123xyz"
}
```

**✅ 重要约束**：
- ✅ **包含** `transactionId`（微信支付订单号）
- ✅ `status` 固定为 `"paid"`
- ✅ 此时订单已经支付成功
- ✅ 可以安全地触发业务逻辑

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
    
    const { 
      outTradeNo, transactionId, status, 
      packageType, generationId, openid 
    } = req.body;
    
    // 2. 参数验证
    if (!outTradeNo) {
      return res.status(400).json({ error: '缺少订单号' });
    }
    
    // ⚠️ transactionId 在支付成功通知中是必需的
    if (!transactionId) {
      console.warn('[PAYMENT_NOTIFY] 缺少微信订单号，可能是订单备份通知');
      // 订单备份通知不需要处理业务逻辑
      return res.json({ success: true, message: '订单备份已接收' });
    }
    
    // 3. 更新订单状态（幂等性处理）
    const order = await db.findOne('payment_orders', { out_trade_no: outTradeNo });
    
    if (!order) {
      console.warn(`[PAYMENT_NOTIFY] 订单不存在: ${outTradeNo}`);
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 只有 pending 状态的订单才更新
    if (order.status === 'pending' && status === 'paid') {
      await db.update('payment_orders', 
        { out_trade_no: outTradeNo },
        { 
          status: 'paid', 
          transaction_id: transactionId,
          paid_at: new Date(),
          updated_at: new Date()
        }
      );
      
      // 更新用户权益
      if (order.user_id && packageType) {
        await db.update('users',
          { id: order.user_id },
          { payment_status: packageType, updated_at: new Date() }
        );
      }
      
      console.log(`[PAYMENT_NOTIFY] 订单 ${outTradeNo} 状态已更新为 paid`);
      
      // 4. 触发业务逻辑
      await triggerBusinessLogic({
        orderId: order.id,
        userId: order.user_id,
        packageType,
        generationId
      });
      
      // 5. 实时推送前端（可选）
      io.to(`order:${outTradeNo}`).emit('payment:success', {
        outTradeNo,
        status: 'paid',
        packageType
      });
    } else {
      console.log(`[PAYMENT_NOTIFY] 订单已处理，当前状态: ${order.status}`);
    }
    
    res.json({ success: true, message: '处理成功' });
  } catch (error) {
    console.error('[PAYMENT_NOTIFY] 处理失败:', error);
    res.status(500).json({ error: '处理失败', message: error.message });
  }
});
```

---

### 接口 3：价格配置接口（推荐）

**用途**：提供最新的价格配置给云函数

**接口路径**：`GET /api/prices/current`

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
    const prices = await priceConfigService.getCurrentPrices();
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
    res.status(500).json({ 
      success: false, 
      error: '获取价格失败' 
    });
  }
});
```

---

## 🔐 安全配置

### 1. 生成内部密钥

```bash
openssl rand -hex 32
```

### 2. 配置环境变量

**云函数环境变量**：
```bash
INTERNAL_API_SECRET=<生成的密钥>
API_BASE_URL=http://your-backend-api.com
```

**后端环境变量**：
```bash
INTERNAL_API_SECRET=<相同的密钥>
```

### 3. 验证请求来源

```javascript
const secret = req.headers['x-internal-secret'];
if (secret !== process.env.INTERNAL_API_SECRET) {
  return res.status(403).json({ error: '无权访问' });
}
```

---

## 📊 数据字段说明

### payment_orders 表关键字段

| 字段 | 类型 | 说明 | 何时有值 |
|------|------|------|----------|
| `id` | VARCHAR(36) | 订单唯一标识 | 创建时 |
| `out_trade_no` | VARCHAR(64) | 商户订单号 | 创建时 |
| `transaction_id` | VARCHAR(100) | 微信支付订单号 | **支付成功后** |
| `status` | ENUM | 订单状态 | 创建时 pending，支付后 paid |
| `paid_at` | TIMESTAMP | 支付完成时间 | **支付成功后** |
| `amount` | DECIMAL(10,2) | 订单金额（元） | 创建时 |
| `_openid` | VARCHAR(256) | 用户 OpenID | 创建时 |

**⚠️ 关键区别**：
- `out_trade_no`：创建订单时生成，用于查询订单
- `transaction_id`：支付成功后由微信返回，用于退款等操作

---

## 🔄 接口调用时序

### 正常流程（数据库可用）

```
1. 用户发起支付
   ↓
2. 云函数创建订单
   - 写入数据库成功
   - ❌ 不调用后端接口
   ↓
3. 用户完成支付
   ↓
4. 微信回调云函数
   - 验证签名
   - 更新订单状态 (status: paid)
   - 更新 transaction_id
   - 更新 paid_at
   ↓
5. 云函数通知后端
   ✅ POST /api/payment/internal/notify
   - 包含 transactionId
   - status = 'paid'
   ↓
6. 后端处理业务逻辑
   - 更新用户权益 ⭐
   - 触发业务流程
   - 实时推送前端
```

### 异常流程（数据库故障）

```
1. 用户发起支付
   ↓
2. 云函数创建订单
   - 写入数据库失败 ❌
   ↓
3. 云函数通知后端备份
   ✅ POST /api/payment/internal/order-created
   - 不包含 transactionId
   - status = 'pending'
   ↓
4. 用户完成支付
   ↓
5. 微信回调云函数
   - 尝试更新数据库（可能失败）
   ↓
6. 云函数通知后端
   ✅ POST /api/payment/internal/notify
   - 包含 transactionId
   - status = 'paid'
```

---

## ⚠️ 常见错误和解决方案

### 错误 1：400 - 缺少 transactionId

**原因**：后端接口期望所有通知都包含 `transactionId`

**解决方案**：
```javascript
// ❌ 错误的实现
if (!transactionId) {
  return res.status(400).json({ error: '缺少微信订单号' });
}

// ✅ 正确的实现
if (!transactionId) {
  // 这是订单备份通知，不需要处理业务逻辑
  console.log('[PAYMENT] 订单备份通知，无需处理');
  return res.json({ success: true, message: '订单备份已接收' });
}
```

### 错误 2：重复处理支付通知

**原因**：没有幂等性处理

**解决方案**：
```javascript
// 只更新 pending 状态的订单
if (order.status === 'pending' && status === 'paid') {
  await updateOrder();
} else {
  console.log(`订单已处理，当前状态: ${order.status}`);
}
```

### 错误 3：外键约束失败

**原因**：用户不存在

**解决方案**：
```javascript
// 在插入订单前确保用户存在
let userId = req.body.userId;
if (!userId && req.body.openid) {
  const user = await findOrCreateUser(req.body.openid);
  userId = user.id;
}
```

---

## 🧪 测试验证

### 1. 测试订单备份接口

```bash
curl -X POST http://your-api.com/api/payment/internal/order-created \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: your-secret-key" \
  -d '{
    "orderId": "test-order-123",
    "outTradeNo": "test-trade-456",
    "userId": "101",
    "openid": "test-openid",
    "amount": 2990,
    "packageType": "premium",
    "tradeType": "NATIVE",
    "status": "pending",
    "reason": "db_unavailable"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "message": "订单已备份",
  "userId": "101"
}
```

### 2. 测试支付通知接口

```bash
curl -X POST http://your-api.com/api/payment/internal/notify \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: your-secret-key" \
  -d '{
    "outTradeNo": "test-trade-456",
    "transactionId": "wx-test-789",
    "status": "paid",
    "packageType": "premium",
    "generationId": "gen_123",
    "openid": "test-openid"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "message": "处理成功"
}
```

---

## 📝 部署检查清单

### 后端实现

- [ ] 实现 `/api/payment/internal/order-created` 接口
  - [ ] 参数验证（不要求 transactionId）
  - [ ] 用户创建逻辑
  - [ ] 订单备份逻辑
  - [ ] 错误日志记录

- [ ] 实现 `/api/payment/internal/notify` 接口
  - [ ] 参数验证（要求 transactionId）
  - [ ] 幂等性处理
  - [ ] 业务逻辑触发
  - [ ] 实时推送（可选）

- [ ] 实现 `/api/prices/current` 接口
  - [ ] 返回最新价格配置

### 环境配置

- [ ] 配置 `INTERNAL_API_SECRET` 环境变量
- [ ] 配置 `API_BASE_URL` 环境变量
- [ ] 确保两边密钥一致

### 测试验证

- [ ] 测试订单备份接口（不含 transactionId）
- [ ] 测试支付通知接口（含 transactionId）
- [ ] 测试完整支付流程
- [ ] 测试数据库故障场景

---

## 🎯 架构建议

### 推荐架构

```
云函数职责：
✅ 支付流程管理
✅ 数据持久化（订单记录）
✅ 微信 API 调用
✅ 支付回调处理
❌ 不处理业务逻辑（如用户权益）

后端职责：
✅ 业务逻辑处理
✅ 用户权益更新 ⭐
✅ 数据备份（故障时）
✅ 实时推送
✅ 订单管理
```

### 不推荐的做法

❌ 后端直接调用微信支付 API（增加复杂度）
❌ 云函数处理复杂业务逻辑（职责不清）
❌ 订单创建时就触发业务逻辑（用户还没支付）

---

**文档版本**：v2.0  
**最后更新**：2026-01-27  
**维护状态**：✅ 生产就绪
