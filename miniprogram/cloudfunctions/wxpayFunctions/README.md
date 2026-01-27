# 微信支付云函数

支持小程序支付（JSAPI）和 PC 扫码支付（Native）的云函数。

## 功能特性

- ✅ **JSAPI 支付**：小程序内支付，通过 `cloudbase_module` 调用
- ✅ **Native 支付**：PC 扫码支付，直接调用微信支付 API v3
- ✅ **价格配置**：从后端 API 动态获取价格，支持降级方案
- ✅ **订单存储**：自动存储订单到数据库

---

## 📦 快速开始

### 部署前检查清单

#### 1. 安装依赖
```bash
cd miniprogram/cloudfunctions/wxpayFunctions
npm install
```

#### 2. 准备环境变量（Native 支付必需）
- [ ] `WECHAT_MCHID` - 商户号
- [ ] `WECHAT_APPID` - 小程序 AppID
- [ ] `WECHAT_SERIAL_NO` - 证书序列号（40位十六进制）
- [ ] `WECHAT_PRIVATE_KEY` - 商户私钥（包含 `\n` 换行符）
- [ ] `WECHAT_APIV3_KEY` - APIv3 密钥（32位字符串）

#### 3. 部署云函数
- 打开微信开发者工具
- 右键 `wxpayFunctions` → "上传并部署：云端安装依赖"
- 在云开发控制台配置环境变量

---

## 环境变量配置

在微信云开发控制台配置以下环境变量：

### 必需配置（Native 支付）

```bash
# 微信支付配置
WECHAT_MCHID=your_mchid                    # 商户号
WECHAT_APPID=your_appid                    # AppID
WECHAT_SERIAL_NO=your_serial_no            # 证书序列号
WECHAT_PRIVATE_KEY=-----BEGIN...-----      # 商户私钥
WECHAT_APIV3_KEY=your_apiv3_key            # APIv3 密钥

# 后端 API（用于价格查询和回调通知）
API_BASE_URL=https://your-api.com          # 后端 API 地址

# 支付回调地址（重要！使用云函数 HTTP 触发器地址）
# 格式：https://环境ID.api.tcloudbasegateway.com/HTTP访问路径
# 示例：https://test-1g71tc7eb37627e2.api.tcloudbasegateway.com/pay
# 
# 如果不配置，将使用 API_BASE_URL + /api/payment/callback
# 或使用占位符地址（需要手动查询订单状态）
WECHAT_NOTIFY_URL=https://your-env.api.tcloudbasegateway.com/pay
```

### 可选配置

```bash
# 微信支付平台公钥证书（用于验证回调签名）
# 如果不配置，SDK 会在首次调用时自动从微信服务器获取
WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----

# 数据库连接（用于订单存储）
DATABASE_URL=mysql://user:pass@host:port/db

# 内部 API 密钥（用于云函数与后端服务器之间的安全通信）
# 如果配置了此项，云函数通知后端时会在请求头中携带此密钥
# 后端可以验证此密钥以确保请求来自可信的云函数
INTERNAL_API_SECRET=your-secret-key-here
```

## 调用方式

### 1. JSAPI 支付（小程序）

```javascript
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    $url: 'wxpay_order',
    packageType: 'premium',  // 套餐类型: basic | premium
    generationId: 'gen_123', // 生成任务 ID（可选）
    userId: '104',           // 用户 ID（可选）
    tradeType: 'JSAPI'       // 支付类型（默认）
  }
}).then(res => {
  if (res.result.code === 0) {
    const { timeStamp, nonceStr, packageVal, paySign } = res.result.data;
    // 调用微信支付
    wx.requestPayment({ timeStamp, nonceStr, package: packageVal, paySign });
  }
});
```

### 2. Native 支付（PC 扫码）

```javascript
// 从其他项目调用
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    $url: 'wxpay_order',
    packageType: 'premium',  // 套餐类型: basic | premium
    userId: '104',           // 用户 ID（可选）
    tradeType: 'NATIVE'      // PC 扫码支付
  }
}).then(res => {
  if (res.result.code === 0) {
    const { codeUrl } = res.result.data;
    // 生成二维码展示给用户扫码
    console.log('支付二维码:', codeUrl);
  }
});
```

### 3. 自定义金额支付

```javascript
wx.cloud.callFunction({
  name: 'wxpayFunctions',
  data: {
    $url: 'wxpay_order',
    amount: 9900,            // 自定义金额（分）
    description: '自定义商品', // 商品描述
    tradeType: 'NATIVE'
  }
});
```

## 返回格式

### 成功响应

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

### 错误响应

```javascript
{
  code: -1,
  msg: '错误信息',
  error: '详细错误'
}
```

## 架构说明

### 混合架构（推荐）⭐

**支付回调流程**：
```
微信支付成功
    ↓
云函数回调（主）
    ↓
写入数据库 ← 保证数据持久化
    ↓
异步通知后端 ← 触发业务逻辑（可选）
    ↓
后端实时推送前端 ← 提升用户体验（可选）
```

**架构优势**：
- ✅ **高可用**：云函数保证回调接收成功（自动HTTPS、自动扩容）
- ✅ **统一架构**：JSAPI和Native使用同一套回调逻辑
- ✅ **实时性**：后端可以通过WebSocket实时推送支付结果
- ✅ **降级方案**：即使后端故障，云函数仍能记录订单
- ✅ **成本优化**：云函数按量计费，小流量几乎免费

### JSAPI 支付流程
```
小程序 → 云函数 → cloudbase_module → 微信支付 API
```

### Native 支付流程
```
其他项目 → 云函数 → 微信支付 API v3 → 返回二维码
```

**优势：**
- Native 支付不依赖后端，云函数独立完成
- 减少网络延迟和故障点
- 其他项目可直接调用云函数完成支付

### 回调地址配置

**推荐配置（混合架构）**：
```bash
# 使用云函数的 HTTP 触发器地址作为回调地址
WECHAT_NOTIFY_URL=https://xxx.service.tcloudbase.com/wxpay_order_callback

# 配置后端 API 地址（用于异步通知）
API_BASE_URL=http://111.231.6.34

# 配置内部密钥（可选，用于验证云函数到后端的请求）
INTERNAL_API_SECRET=your-secret-key-here
```

**工作流程**：
1. 微信支付成功 → 回调云函数
2. 云函数写入数据库（主要职责）
3. 云函数异步通知后端（不阻塞返回）
4. 后端触发业务逻辑（如WebSocket推送）
5. 前端轮询查询订单状态（降级方案）

**注意事项**：
- 云函数必须在 **5 秒内**返回响应给微信
- 异步任务不要阻塞主流程
- 后端通知失败不影响订单记录

## 部署

1. 安装依赖：
```bash
cd miniprogram/cloudfunctions/wxpayFunctions
npm install
```

2. 配置环境变量（见上方）

3. 上传云函数到微信云开发

## 注意事项

1. **证书配置**：`WECHAT_PRIVATE_KEY` 需要包含完整的私钥内容，支持 `\n` 换行符
2. **回调地址**：确保 `WECHAT_NOTIFY_URL` 可被微信服务器访问
3. **价格配置**：云函数会从 `API_BASE_URL/api/prices/current` 获取价格，失败时使用降级方案
4. **订单存储**：订单会自动存储到数据库（需配置 `DATABASE_URL`），存储失败不影响支付

## 故障排查

### Native 支付失败："缺少公钥"错误

**问题原因**：`wechatpay-node-v3` SDK 需要微信支付平台公钥证书来验证签名

**解决方案**：

**方案 1：配置平台公钥证书（推荐）**

1. **获取平台公钥证书**：
   - 方式 1：微信商户平台 → API安全 → 平台证书 → 下载证书
   - 方式 2：使用微信支付证书工具自动下载

2. **转换证书格式**：
   ```bash
   # 使用转换脚本
   ./convert-private-key.sh wechatpay_certificate.pem
   
   # 或手动转换
   cat wechatpay_certificate.pem | sed ':a;N;$!ba;s/\n/\\n/g'
   ```

3. **配置环境变量**：
   在云函数环境变量中添加 `WECHAT_PUBLIC_KEY`：
   ```
   WECHAT_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----
   ```

**方案 2：让 SDK 自动获取（简单但需要网络）**

不配置 `WECHAT_PUBLIC_KEY`，SDK 会在首次调用时自动从微信服务器获取平台证书。

**注意事项**：
- 平台证书和商户私钥是不同的，不要混淆
- 平台证书用于验证微信的回调签名
- 商户私钥用于签名你的请求

**验证配置**：查看云函数日志，确认初始化信息：
```
[wxpay_order] 初始化微信支付 SDK，配置信息: {
  appid: 'wx...',
  mchid: '16...',
  serial_no: '5B...',
  hasPrivateKey: true,
  privateKeyLength: 1704,
  hasPublicKey: true,        // 如果配置了公钥
  publicKeyLength: 1234,     // 公钥长度
  hasApiv3Key: true
}
```

### 其他常见问题

1. **检查环境变量是否完整配置**
   - 所有 5 个必需变量都要配置
   - 注意变量名大小写

2. **查看云函数日志中的错误信息**
   - 云开发控制台 → 云函数 → 日志
   - 查看详细的错误堆栈

3. **确认商户号和证书配置正确**
   - 证书序列号是 40 位十六进制字符
   - 商户号是纯数字

4. **验证 APIv3 密钥是否正确**
   - 32 位字符串
   - 在商户平台设置

### 价格获取失败

云函数会自动使用降级方案：
- basic: 0.01 元
- premium: 29.9 元
