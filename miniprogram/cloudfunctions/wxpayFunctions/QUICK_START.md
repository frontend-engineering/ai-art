# 快速开始指南

## 🚀 5分钟快速配置

### 步骤 1：生成内部密钥

```bash
openssl rand -hex 32
```

复制生成的密钥，例如：`a1b2c3d4e5f6...`

---

### 步骤 2：配置云函数环境变量

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

# 回调地址（必需）
WECHAT_NOTIFY_URL=https://xxx.service.tcloudbase.com/wxpay_order_callback

# 后端配置（必需）
API_BASE_URL=http://111.231.6.34
INTERNAL_API_SECRET=<步骤1生成的密钥>

# 数据库（必需）
DATABASE_URL=mysql://art:artPW192026@10.2.101.92:3306/test-1g71tc7eb37627e2
```

---

### 步骤 3：配置后端环境变量

编辑 `backend/.env` 文件：

```bash
# 添加以下配置
INTERNAL_API_SECRET=<步骤1生成的密钥>
API_BASE_URL=http://111.231.6.34
```

---

### 步骤 4：实现后端接口

在 `backend/routes/paymentRoutes.js` 中添加：

```javascript
// 内部通知接口
router.post('/internal/notify', async (req, res) => {
  try {
    // 验证密钥
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { outTradeNo, transactionId, status } = req.body;
    console.log('收到支付通知:', outTradeNo, status);
    
    // 更新订单状态
    // TODO: 实现你的业务逻辑
    
    res.json({ success: true, message: '处理成功' });
  } catch (error) {
    console.error('处理通知失败:', error);
    res.status(500).json({ error: '处理失败' });
  }
});
```


---

### 步骤 5：部署云函数

在微信开发者工具中：

1. 右键 `wxpayFunctions` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

---

### 步骤 6：重启后端服务

```bash
cd backend
pnpm run dev
```

---

### 步骤 7：测试支付流程

#### 测试 Native 支付（PC扫码）

```javascript
// 在云函数测试工具中运行
{
  "type": "wxpay_order",
  "packageType": "basic",
  "amount": 1,
  "tradeType": "NATIVE"
}
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

#### 测试 JSAPI 支付（小程序）

```javascript
// 在小程序中调用
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    type: 'wxpay_order',
    packageType: 'basic',
    tradeType: 'JSAPI'
  }
}).then(res => {
  console.log('支付参数:', res.result);
});
```

---

### 步骤 8：验证回调流程

1. **完成支付**：使用微信扫码支付（0.01元测试）

2. **查看云函数日志**：
   - 微信云开发控制台 → 云函数 → 日志
   - 搜索 `[wxpay_order_callback]`
   - 确认看到"后端通知成功"

3. **查看后端日志**：
   - 确认收到 `收到支付通知` 日志

4. **查询订单状态**：
   ```bash
   curl http://111.231.6.34/api/payment/order/<订单号>
   ```

---

## ✅ 验证清单

配置完成后，请确认：

- [ ] 云函数环境变量已配置完整
- [ ] 后端环境变量已配置
- [ ] 内部密钥在云函数和后端保持一致
- [ ] 后端实现了 `/api/payment/internal/notify` 接口
- [ ] 云函数已重新部署
- [ ] 后端服务已重启
- [ ] 测试支付流程成功
- [ ] 云函数日志显示"后端通知成功"
- [ ] 后端日志显示收到通知

---

## 🐛 常见问题快速修复

### 问题 1：云函数报错"缺少公钥"

**解决**：配置 `WECHAT_PUBLIC_KEY` 环境变量

### 问题 2：后端没收到通知

**检查**：
1. `API_BASE_URL` 是否正确
2. 后端服务是否运行
3. 防火墙是否开放

### 问题 3：内部通知返回 403

**检查**：`INTERNAL_API_SECRET` 在云函数和后端是否一致

### 问题 4：支付成功但订单未更新

**检查**：
1. 云函数日志是否有错误
2. 数据库连接是否正常
3. `DATABASE_URL` 是否配置正确

---

## 📖 下一步

- 阅读 [后端 API 对接文档](./BACKEND_API_INTEGRATION.md)
- 阅读 [完整 README](./README.md)
- 实现 WebSocket 实时推送（可选）
- 配置监控告警（推荐）

---

**配置遇到问题？** 查看云函数日志和后端日志获取详细错误信息。
