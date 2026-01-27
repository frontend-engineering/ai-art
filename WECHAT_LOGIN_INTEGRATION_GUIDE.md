# 微信扫码登录集成指南

本文档面向业务方，介绍如何接入微信扫码登录功能。

## 目录

- [概述](#概述)
- [核心原理](#核心原理)
- [云函数 API](#云函数-api)
- [集成流程](#集成流程)
- [代码示例](#代码示例)
- [错误处理](#错误处理)

---

## 概述

微信扫码登录允许用户通过微信小程序扫描网页二维码完成登录，无需输入账号密码。

**核心优势：**
- 安全便捷：利用微信身份验证
- 用户体验好：一键扫码即可登录
- 实现简单：云函数自动处理身份验证

---

## 核心原理

### 登录流程

```
Web 页面                    业务后端                    云函数                    微信小程序
   |                          |                          |                          |
   |--1. 请求二维码----------->|                          |                          |
   |<--返回 sessionId + 二维码--|                          |                          |
   |                          |                          |                          |
   |                          |                          |                          |<--2. 用户扫码
   |                          |<--3. 调用 wechat_login---|<--微信自动验证 OPENID----|
   |                          |                          |--创建/更新用户            |
   |                          |                          |--生成 token              |
   |                          |--返回 token + 用户信息--->|                          |
   |                          |                          |                          |
   |                          |--4. 绑定 session-------->|                          |
   |                          |   (sessionId + token)    |                          |
   |                          |                          |                          |
   |--5. 轮询登录状态--------->|                          |                          |
   |<--返回 token + 用户信息---|                          |                          |
```

### 关键点

1. **微信自动验证**：小程序调用云函数时，微信自动注入并验证用户的 OPENID
2. **Session 绑定**：通过 sessionId 将扫码操作与 Web 页面关联
3. **Token 返回**：云函数生成 token，用于后续 API 调用

---

## 云函数 API

### 1. wechat_login

**功能：** 用户登录

**云函数地址：**
```
云环境ID: [your-env-id]
函数名称: wechat_login
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source | String | 是 | 固定值：`web` |
| sessionId | String | 是 | Web 页面生成的会话 ID |
| userInfo | Object | 否 | 用户信息（昵称、头像） |
| clientIp | String | 否 | 客户端 IP |

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
      "status": "active",
      "payment_status": "free",
      "business_level": "free",
      "regenerate_count": 3,
      "daily_limit": 10,
      "used_today": 0,
      "total_quota": 100,
      "used_quota": 0,
      "created_at": "2024-01-01 00:00:00"
    }
  }
}
```

---

### 2. wechat_get_user

**功能：** 获取用户信息

**云函数地址：**
```
云环境ID: [your-env-id]
函数名称: wechat_get_user
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | String | 是 | 登录时返回的 token |

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
      "status": "active",
      "payment_status": "free",
      "business_level": "free",
      "regenerate_count": 3,
      "daily_limit": 10,
      "used_today": 0,
      "total_quota": 100,
      "used_quota": 0,
      "last_login_at": "2024-01-01 00:00:00",
      "created_at": "2024-01-01 00:00:00"
    }
  }
}
```

---

## 集成流程

### 步骤 1：生成登录二维码

业务后端生成唯一的 `sessionId` 和二维码：

```javascript
// 业务后端 API
app.get('/api/auth/qrcode', (req, res) => {
  // 生成唯一 sessionId
  const sessionId = crypto.randomUUID();
  
  // 二维码数据
  const qrData = {
    action: 'wechat_login',
    sessionId: sessionId,
    timestamp: Date.now()
  };
  
  // 生成二维码图片
  const qrCode = generateQRCode(JSON.stringify(qrData));
  
  // 返回给前端
  res.json({
    sessionId: sessionId,
    qrCode: qrCode,
    expiresIn: 300 // 5分钟过期
  });
});
```

---

### 步骤 2：前端显示二维码

Web 前端请求并显示二维码：

```javascript
// 前端代码
async function showLoginQRCode() {
  // 请求二维码
  const response = await fetch('/api/auth/qrcode');
  const data = await response.json();
  
  // 显示二维码
  document.getElementById('qrcode').src = data.qrCode;
  
  // 开始轮询登录状态
  pollLoginStatus(data.sessionId);
}
```

---

### 步骤 3：用户扫码（小程序端）

用户使用微信扫描二维码，小程序调用云函数：

```javascript
// 小程序代码（由小程序开发者实现）
wx.scanCode({
  success: (res) => {
    const qrData = JSON.parse(res.result);
    
    if (qrData.action === 'wechat_login') {
      // 调用云函数登录
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

---

### 步骤 4：绑定 Session

云函数调用业务后端 API，绑定 token 到 sessionId：

```javascript
// 业务后端 API
app.post('/api/auth/bind-session', (req, res) => {
  const { sessionId, token, status } = req.body;
  
  // 验证内部 API 密钥
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // 存储到 Redis 或内存（5分钟过期）
  sessionStore.set(sessionId, {
    token: token,
    status: status,
    timestamp: Date.now()
  }, 300);
  
  res.json({ success: true });
});
```

---

### 步骤 5：轮询登录状态

Web 前端轮询检查登录状态：

```javascript
// 前端轮询代码
async function pollLoginStatus(sessionId) {
  const maxAttempts = 60; // 最多轮询 60 次（5 分钟）
  let attempts = 0;
  
  const poll = async () => {
    if (attempts >= maxAttempts) {
      showError('登录超时，请刷新页面重试');
      return;
    }
    
    try {
      const response = await fetch(`/api/auth/check-session?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        // 登录成功
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else if (data.status === 'pending') {
        // 继续轮询
        attempts++;
        setTimeout(poll, 5000); // 5秒后重试
      } else {
        showError('登录失败，请重试');
      }
    } catch (error) {
      console.error('轮询失败:', error);
      attempts++;
      setTimeout(poll, 5000);
    }
  };
  
  poll();
}
```

---

### 步骤 6：检查 Session 状态

业务后端提供 API 检查 session 状态：

```javascript
// 业务后端 API
app.get('/api/auth/check-session', (req, res) => {
  const { sessionId } = req.query;
  
  // 从 Redis 或内存获取
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return res.json({ status: 'pending' });
  }
  
  if (session.status === 'success') {
    // 返回 token 并删除 session
    sessionStore.delete(sessionId);
    return res.json({
      status: 'success',
      token: session.token
    });
  }
  
  res.json({ status: 'pending' });
});
```

---

## 代码示例

### 完整的前端集成示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>微信扫码登录</title>
</head>
<body>
  <div id="login-container">
    <h2>微信扫码登录</h2>
    <img id="qrcode" alt="扫码登录" />
    <p id="status">请使用微信扫描二维码</p>
  </div>

  <script>
    let sessionId = null;

    // 初始化登录
    async function initLogin() {
      try {
        // 获取二维码
        const response = await fetch('/api/auth/qrcode');
        const data = await response.json();
        
        sessionId = data.sessionId;
        document.getElementById('qrcode').src = data.qrCode;
        
        // 开始轮询
        pollLoginStatus(sessionId);
      } catch (error) {
        document.getElementById('status').textContent = '加载失败，请刷新页面';
      }
    }

    // 轮询登录状态
    async function pollLoginStatus(sessionId) {
      let attempts = 0;
      const maxAttempts = 60;
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          document.getElementById('status').textContent = '登录超时，请刷新页面';
          return;
        }
        
        try {
          const response = await fetch(`/api/auth/check-session?sessionId=${sessionId}`);
          const data = await response.json();
          
          if (data.status === 'success') {
            localStorage.setItem('token', data.token);
            document.getElementById('status').textContent = '登录成功，跳转中...';
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          } else {
            attempts++;
            setTimeout(poll, 5000);
          }
        } catch (error) {
          attempts++;
          setTimeout(poll, 5000);
        }
      };
      
      poll();
    }

    // 页面加载时初始化
    window.onload = initLogin;
  </script>
</body>
</html>
```

---

### 使用 Token 调用 API

登录成功后，使用 token 调用云函数：

```javascript
// 获取用户信息
async function getUserInfo() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('https://your-cloud-function-url/wechat_get_user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });
  
  const data = await response.json();
  
  if (data.code === 0) {
    console.log('用户信息:', data.data.user);
  } else {
    console.error('获取失败:', data.msg);
  }
}
```

---

## 错误处理

### 常见错误

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| -1 | 通用错误 | 查看 msg 字段 |
| 0 | 成功 | - |

### 错误处理示例

```javascript
async function callCloudFunction(functionName, data) {
  try {
    const response = await fetch(`https://your-cloud-function-url/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.code === 0) {
      return result.data;
    } else {
      throw new Error(result.msg || '请求失败');
    }
  } catch (error) {
    console.error('云函数调用失败:', error);
    throw error;
  }
}
```

---

## 技术说明

### Token 格式

```
base64({userId, openid, exp}).hmac_sha256_signature
```

**特点：**
- 包含用户 ID 和 OPENID
- 7 天有效期
- HMAC-SHA256 签名防篡改

### 环境变量配置

云函数需要配置以下环境变量：

| 变量名 | 说明 | 是否必需 |
|--------|------|----------|
| JWT_SECRET | Token 签名密钥 | 建议配置 |
| API_BASE_URL | 业务后端地址 | 必需 |
| INTERNAL_API_SECRET | 内部 API 密钥 | 建议配置 |

### 安全性

1. **微信身份验证**：OPENID 由微信验证，安全可靠
2. **HTTPS 传输**：所有通信使用 HTTPS 加密
3. **Token 签名**：使用 HMAC-SHA256 防止篡改
4. **Session 过期**：二维码和 session 都有过期时间

---

## 附录

### 相关文档

- [技术实现说明](./WECHAT_CLOUDFUNCTION_SIMPLIFICATION.md)
- [微信小程序云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [腾讯云开发文档](https://cloud.tencent.com/document/product/876)

### 技术支持

如有问题，请联系技术团队。

---

**文档版本：** v2.0  
**最后更新：** 2024-01-27  
**维护者：** 技术团队
