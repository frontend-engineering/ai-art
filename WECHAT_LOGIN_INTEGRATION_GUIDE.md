# 微信登录云函数集成指南（简化版 v2.0）

本文档面向业务方，介绍如何接入微信登录云函数，实现 Web 扫码登录功能。

## 目录

- [概述](#概述)
- [核心原理](#核心原理)
- [云函数列表](#云函数列表)
- [Web 扫码登录流程](#web-扫码登录流程)
- [API 调用示例](#api-调用示例)
- [错误处理](#错误处理)
- [技术说明](#技术说明)

---

## 概述

微信登录云函数提供了简洁高效的用户认证功能，支持：

- **Web 扫码登录**：用户通过微信扫描二维码完成登录
- **用户信息管理**：获取和更新用户基本信息
- **自动身份验证**：利用微信云开发的原生安全机制

**核心优势：**
- 无需复杂的 JWT 或加密实现
- 微信自动验证用户身份
- 代码简洁，易于维护

---

## 核心原理

### 微信云开发的自动身份验证

根据腾讯云开发官方文档：

> 当小程序调用云函数时，微信会自动注入用户身份信息（OPENID），并完成验证。云函数通过 `cloud.getWXContext()` 即可获取已验证的用户身份。

**这意味着：**
1. **无需自定义 JWT**：微信已经完成了身份验证
2. **无需复杂加密**：OPENID 由微信安全传输
3. **可信任的身份**：`cloud.getWXContext()` 返回的信息已经过微信验证

### 两种使用场景

1. **小程序端**：直接使用 OPENID，无需 token
2. **Web 端**：使用简单的 session token（仅用于后端 API 调用）

---

## 云函数列表

### 1. wechat_login（简化版）

**功能：** 用户登录（支持小程序和 Web 扫码）

**云函数地址：**
```
云环境ID: [your-env-id]
函数名称: wechat_login
调用方式: wx.cloud.callFunction() 或 HTTP API
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userInfo | Object | 否 | 用户信息（昵称、头像等） |
| source | String | 否 | 登录来源：`miniprogram`（默认）或 `web` |
| clientIp | String | 否 | 客户端 IP 地址 |
| sessionId | String | Web必填 | Web 扫码登录的会话 ID |

**返回数据：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "base64payload.signature",
    "user": {
      "id": "user-uuid",
      "openid": "oABC123...",
      "nickname": "用户昵称",
      "avatar_url": "https://...",
      "phone": null,
      "status": "active",
      "payment_status": "free",
      "business_level": "free",
      "regenerate_count": 3,
      "daily_limit": 10,
      "used_today": 0,
      "total_quota": 100,
      "used_quota": 0,
      "total_deployments": 0,
      "created_at": "2024-01-01 00:00:00"
    }
  }
}
```

**注意事项：**
- 小程序端：OPENID 由微信自动验证，无需传递 code
- Web 端：返回简单的 session token（非标准 JWT）
- Token 格式：`base64(payload).hmac_signature`

---

### 2. wechat_get_user（简化版）

**功能：** 获取用户信息

**云函数地址：**
```
云环境ID: [your-env-id]
函数名称: wechat_get_user
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | String | Web端必填 | 登录时返回的 token（小程序端可不传） |

**返回数据：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": "user-uuid",
      "openid": "oABC123...",
      "nickname": "用户昵称",
      "avatar_url": "https://...",
      "phone": null,
      "status": "active",
      "payment_status": "free",
      "business_level": "free",
      "regenerate_count": 3,
      "daily_limit": 10,
      "used_today": 0,
      "total_deployments": 0,
      "total_quota": 100,
      "used_quota": 0,
      "last_login_at": "2024-01-01 00:00:00",
      "created_at": "2024-01-01 00:00:00"
    }
  }
}
```

**注意事项：**
- 小程序端：自动使用 OPENID 验证，无需传 token
- Web 端：必须传递 token 参数

---

### 3. wechat_update_user

**功能：** 更新用户信息

**云函数地址：**
```
云环境ID: [your-env-id]
函数名称: wechat_update_user
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | String | 是 | 用户 ID |
| updates | Object | 是 | 要更新的字段 |

**允许更新的字段：**
- `nickname`：昵称
- `avatar_url`：头像 URL
- `phone`：手机号

**返回数据：**

```json
{
  "code": 0,
  "msg": "success"
}
```

---

## Web 扫码登录流程

### 流程图

```
用户浏览器                    业务后端                    云函数
    |                          |                          |
    |--1. 请求登录二维码------->|                          |
    |<--返回 sessionId + 二维码--|                          |
    |                          |                          |
    |--2. 扫码（微信小程序）---->|                          |
    |                          |--3. 调用 wechat_login--->|
    |                          |                          |--微信自动验证 OPENID
    |                          |                          |--创建/更新用户
    |                          |                          |--生成 session token
    |                          |<--返回 token + 用户信息---|
    |                          |                          |
    |                          |--4. 绑定 session-------->|
    |                          |   (sessionId + token)    |
    |                          |                          |
    |--5. 轮询登录状态--------->|                          |
    |<--返回 token + 用户信息---|                          |
    |                          |                          |
```

### 详细步骤

#### 步骤 1：生成登录二维码

业务后端生成唯一的 `sessionId` 和二维码：

```javascript
// 业务后端代码示例
const sessionId = generateUUID();
const qrCodeData = {
  action: 'wechat_login',
  sessionId: sessionId,
  timestamp: Date.now()
};

// 生成二维码
const qrCode = await generateQRCode(JSON.stringify(qrCodeData));

// 返回给前端
res.json({
  sessionId: sessionId,
  qrCode: qrCode,
  expiresIn: 300 // 5分钟过期
});
```

#### 步骤 2：用户扫码

用户使用微信扫描二维码，小程序解析二维码数据：

```javascript
// 小程序代码示例
wx.scanCode({
  success: (res) => {
    const qrData = JSON.parse(res.result);
    
    if (qrData.action === 'wechat_login') {
      // 调用云函数登录
      // 注意：OPENID 由微信自动验证，无需手动传递
      wx.cloud.callFunction({
        name: 'wechat_login',
        data: {
          source: 'web',
          sessionId: qrData.sessionId,
          userInfo: {
            nickName: '用户昵称',
            avatarUrl: 'https://...'
          }
        },
        success: (res) => {
          if (res.result.code === 0) {
            wx.showToast({ title: '登录成功' });
          }
        }
      });
    }
  }
});
```

#### 步骤 3：云函数处理

云函数自动获取微信验证的 OPENID，创建或更新用户，生成 token。

#### 步骤 4：绑定 Session

云函数调用业务后端 API，将 token 绑定到 sessionId：

```javascript
// 业务后端 API 示例
app.post('/api/auth/bind-session', (req, res) => {
  const { sessionId, token, status } = req.body;
  
  // 存储到 Redis 或内存
  sessionStore.set(sessionId, {
    token: token,
    status: status,
    timestamp: Date.now()
  });
  
  res.json({ success: true });
});
```

#### 步骤 5：前端轮询

前端轮询业务后端，检查登录状态：

```javascript
// 前端轮询代码示例
const pollLoginStatus = async (sessionId) => {
  const maxAttempts = 60; // 最多轮询 60 次（5 分钟）
  let attempts = 0;
  
  const poll = async () => {
    if (attempts >= maxAttempts) {
      console.log('登录超时');
      return;
    }
    
    const response = await fetch(`/api/auth/check-session?sessionId=${sessionId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      // 登录成功，保存 token
      localStorage.setItem('token', data.token);
      console.log('登录成功');
    } else {
      // 继续轮询
      attempts++;
      setTimeout(poll, 5000); // 5秒后重试
    }
  };
  
  poll();
};
```

---

## API 调用示例

### 小程序端调用

```javascript
// 初始化云开发
wx.cloud.init({
  env: 'your-env-id'
});

// 登录
wx.cloud.callFunction({
  name: 'wechat_login',
  data: {
    userInfo: {
      nickName: '用户昵称',
      avatarUrl: 'https://...'
    }
  },
  success: (res) => {
    console.log('登录成功:', res.result);
    // 小程序端无需保存 token，后续调用自动使用 OPENID
  }
});

// 获取用户信息（无需传 token）
wx.cloud.callFunction({
  name: 'wechat_get_user',
  data: {},
  success: (res) => {
    console.log('用户信息:', res.result.data.user);
  }
});
```

### Web 端调用

```javascript
// Web 端需要使用 token
const token = localStorage.getItem('token');

// 调用云函数（通过 HTTP API）
fetch('https://your-cloud-function-url/wechat_get_user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: token
  })
})
.then(res => res.json())
.then(data => {
  console.log('用户信息:', data.data.user);
});
```

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| -1 | 通用错误 | 查看 msg 字段获取详细信息 |
| 0 | 成功 | - |

### 错误处理示例

```javascript
wx.cloud.callFunction({
  name: 'wechat_login',
  data: { /* ... */ },
  success: (res) => {
    if (res.result.code === 0) {
      // 成功
      console.log('登录成功');
    } else {
      // 失败
      console.error('登录失败:', res.result.msg);
      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      });
    }
  },
  fail: (err) => {
    console.error('云函数调用失败:', err);
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
  }
});
```

---

## 技术说明

### 1. 身份验证机制

**小程序端：**
- 微信自动验证用户身份
- `cloud.getWXContext()` 返回已验证的 OPENID
- 无需自定义 JWT 或加密

**Web 端：**
- 使用简单的 session token
- Token 格式：`base64(payload).hmac_signature`
- 非标准 JWT，但足够安全

### 2. Token 说明

**Token 结构：**
```
base64({userId, openid, exp}).hmac_sha256_signature
```

**特点：**
- 比标准 JWT 简单
- 包含必要的用户信息
- 7 天有效期
- HMAC-SHA256 签名防篡改

### 3. 环境变量（可选）

| 变量名 | 说明 | 是否必需 |
|--------|------|----------|
| JWT_SECRET | Token 签名密钥 | Web 登录时建议配置 |
| API_BASE_URL | 后端 API 地址 | Web 登录时必需 |
| INTERNAL_API_SECRET | 内部 API 密钥 | 可选 |

### 4. 与旧版本的区别

**简化前（v1.0）：**
- 完整的 JWT 实现（RFC 7519）
- AES-256-GCM 加密
- Nonce 防重放机制
- 多个必需的环境变量
- 代码复杂度高（~400 行）

**简化后（v2.0）：**
- 利用微信原生身份验证
- 简单的 session token
- 移除不必要的加密
- 最少的环境变量
- 代码简洁易维护（~150 行）

### 5. 安全性说明

虽然简化了实现，但安全性并未降低：

1. **微信身份验证**：OPENID 由微信验证，比自定义 JWT 更安全
2. **云函数环境**：运行在腾讯云的可信环境中
3. **HTTPS 传输**：所有通信都通过 HTTPS 加密
4. **签名验证**：Token 使用 HMAC-SHA256 签名，防止篡改

---

## 附录

### A. 相关文档

- [微信小程序云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [腾讯云开发文档](https://cloud.tencent.com/document/product/876)
- [CloudBase 微信认证文档](https://docs.cloudbase.net/en/ai/cloudbase-ai-toolkit/prompts/auth-wechat)
- [简化方案技术说明](./WECHAT_CLOUDFUNCTION_SIMPLIFICATION.md)

### B. 技术支持

如有问题，请联系技术团队。

---

**文档版本：** v2.0（简化版）  
**最后更新：** 2024-01-27  
**维护者：** 技术团队
