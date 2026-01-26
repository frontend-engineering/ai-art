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

# 后端 API
API_BASE_URL=https://your-api.com          # 后端 API 地址
```

### 可选配置

```bash
# 自定义回调地址（默认使用 API_BASE_URL + /api/payment/callback）
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/callback

# 数据库连接（用于订单存储）
DATABASE_URL=mysql://user:pass@host:port/db
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

### Native 支付失败

1. 检查环境变量是否完整配置
2. 查看云函数日志中的错误信息
3. 确认商户号和证书配置正确
4. 验证 APIv3 密钥是否正确

### 价格获取失败

云函数会自动使用降级方案：
- basic: 0.01 元
- premium: 29.9 元
