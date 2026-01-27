# 微信开放平台扫码登录集成指南

> **重要说明：** 本文档描述的是基于**微信开放平台 OAuth2.0** 的标准扫码登录，用户使用微信 APP 直接扫码授权，无需小程序。

---

## 目录

- [概述](#概述)
- [准备工作](#准备工作)
- [OAuth2.0 授权流程](#oauth20-授权流程)
- [实现步骤](#实现步骤)
- [代码示例](#代码示例)
- [常见问题](#常见问题)

---

## 概述

### 什么是微信开放平台扫码登录？

微信开放平台扫码登录是基于 **OAuth2.0 协议**的授权登录系统，允许用户使用微信身份安全登录第三方网站。

### 核心特点

1. **无需小程序**：用户直接用微信 APP 扫码
2. **标准 OAuth2.0**：遵循 OAuth2.0 authorization_code 模式
3. **获取用户信息**：可获取用户的 openid、unionid、昵称、头像等
4. **安全可靠**：微信官方认证，无需用户输入密码

### 与小程序扫码的区别

| 特性 | 微信开放平台扫码 | 小程序扫码 |
|------|-----------------|-----------|
| 需要小程序 | ❌ 不需要 | ✅ 需要 |
| 扫码后 | 微信 APP 内确认 | 跳转到小程序 |
| 适用场景 | 网站登录 | 小程序与网站互通 |
| 申请条件 | 需要企业认证 | 需要小程序 |
| 获取信息 | openid, unionid, 用户信息 | openid, unionid |

---

## 准备工作

### 1. 注册微信开放平台账号

1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册开发者账号
3. 完成开发者资质认证（需要企业资质）

### 2. 创建网站应用

1. 登录微信开放平台
2. 进入"管理中心" → "网站应用"
3. 点击"创建网站应用"
4. 填写应用信息：
   - 应用名称
   - 应用简介
   - 应用官网
   - **授权回调域**（重要！）
5. 提交审核

### 3. 获取 AppID 和 AppSecret

审核通过后，在应用详情页可以看到：
- **AppID**：应用唯一标识
- **AppSecret**：应用密钥（请妥善保管）

### 4. 申请微信登录权限

在应用详情页，申请"微信登录"接口权限。

---

## OAuth2.0 授权流程

### 流程图

```
用户浏览器                    业务后端                    微信开放平台
    |                          |                          |
    |--1. 访问登录页----------->|                          |
    |<--返回登录页面------------|                          |
    |                          |                          |
    |--2. 点击微信登录--------->|                          |
    |<--重定向到微信授权页面-----|                          |
    |                          |                          |
    |--3. 请求授权页面-------------------------->|
    |<--返回二维码页面---------------------------|
    |                          |                          |
    |--4. 微信扫码确认授权---------------------->|
    |                          |                          |
    |--5. 重定向回调（带 code）--->|                          |
    |                          |--6. 用 code 换 token---->|
    |                          |<--返回 access_token------|
    |                          |                          |
    |                          |--7. 获取用户信息-------->|
    |                          |<--返回用户信息-----------|
    |                          |                          |
    |                          |--8. 创建/更新用户         |
    |                          |--9. 生成 session token   |
    |                          |                          |
    |<--10. 登录成功，设置 cookie-|                          |
```

### 详细步骤说明

1. **用户访问登录页**：用户点击"微信登录"按钮
2. **重定向到微信授权页**：跳转到微信开放平台授权页面
3. **显示二维码**：微信显示登录二维码
4. **用户扫码确认**：用户用微信 APP 扫码并确认授权
5. **回调返回 code**：微信重定向回业务后端，URL 带上临时授权码 code
6. **换取 access_token**：后端用 code 换取 access_token
7. **获取用户信息**：用 access_token 调用微信 API 获取用户信息
8. **创建/更新用户**：在数据库中创建或更新用户记录
9. **生成 session**：生成业务系统的 session token
10. **登录成功**：设置 cookie，跳转到首页

---

## 实现步骤

### 步骤 1：生成微信授权 URL

```javascript
// 后端代码
const WECHAT_APPID = process.env.WECHAT_APPID;
const REDIRECT_URI = encodeURIComponent('https://your-domain.com/api/auth/wechat/callback');
const STATE = generateRandomState(); // 生成随机 state，防止 CSRF

const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APPID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=snsapi_login&state=${STATE}#wechat_redirect`;

// 返回给前端或直接重定向
res.redirect(authUrl);
```

### 步骤 2：处理微信回调

```javascript
// 后端回调接口: GET /api/auth/wechat/callback
app.get('/api/auth/wechat/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 1. 验证 state（防止 CSRF 攻击）
  if (!verifyState(state)) {
    return res.status(400).send('Invalid state');
  }
  
  // 2. 用 code 换取 access_token
  const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`;
  
  const tokenResponse = await axios.get(tokenUrl);
  const { access_token, openid, unionid } = tokenResponse.data;
  
  // 3. 获取用户信息
  const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;
  
  const userInfoResponse = await axios.get(userInfoUrl);
  const userInfo = userInfoResponse.data;
  
  // 4. 创建或更新用户
  let user = await db.findUserByOpenid(openid);
  if (!user) {
    user = await db.createUser({
      openid,
      unionid,
      nickname: userInfo.nickname,
      avatar: userInfo.headimgurl
    });
  }
  
  // 5. 生成 session token
  const token = generateToken(user.id);
  
  // 6. 设置 cookie 并重定向
  res.cookie('auth_token', token, { httpOnly: true, secure: true });
  res.redirect('/dashboard');
});
```

### 步骤 3：前端集成

#### 方式一：直接跳转

```html
<a href="/api/auth/wechat/login">
  <button>微信登录</button>
</a>
```

#### 方式二：内嵌二维码（推荐）

```html
<!DOCTYPE html>
<html>
<head>
  <title>微信登录</title>
  <script src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js"></script>
</head>
<body>
  <div id="wechat-login-container"></div>
  
  <script>
    new WxLogin({
      self_redirect: false,
      id: "wechat-login-container",
      appid: "YOUR_APPID",
      scope: "snsapi_login",
      redirect_uri: encodeURIComponent("https://your-domain.com/api/auth/wechat/callback"),
      state: "STATE",
      style: "black", // 或 "white"
      href: "" // 自定义样式 URL
    });
  </script>
</body>
</html>
```

---

## 代码示例

### 完整的后端实现（Node.js + Express）

```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

const WECHAT_APPID = process.env.WECHAT_APPID;
const WECHAT_SECRET = process.env.WECHAT_SECRET;
const REDIRECT_URI = 'https://your-domain.com/api/auth/wechat/callback';

// 存储 state（生产环境应使用 Redis）
const stateStore = new Map();

// 生成随机 state
function generateState() {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, Date.now());
  return state;
}

// 验证 state
function verifyState(state) {
  if (!stateStore.has(state)) return false;
  const timestamp = stateStore.get(state);
  stateStore.delete(state);
  // state 有效期 10 分钟
  return Date.now() - timestamp < 10 * 60 * 1000;
}

// 1. 发起微信登录
app.get('/api/auth/wechat/login', (req, res) => {
  const state = generateState();
  const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  res.redirect(authUrl);
});

// 2. 处理微信回调
app.get('/api/auth/wechat/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // 验证 state
    if (!verifyState(state)) {
      return res.status(400).send('Invalid state parameter');
    }
    
    // 用 code 换取 access_token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`;
    
    const tokenResponse = await axios.get(tokenUrl);
    
    if (tokenResponse.data.errcode) {
      throw new Error(tokenResponse.data.errmsg);
    }
    
    const { access_token, openid, unionid } = tokenResponse.data;
    
    // 获取用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;
    
    const userInfoResponse = await axios.get(userInfoUrl);
    
    if (userInfoResponse.data.errcode) {
      throw new Error(userInfoResponse.data.errmsg);
    }
    
    const userInfo = userInfoResponse.data;
    
    // 创建或更新用户（这里需要连接数据库）
    // const user = await createOrUpdateUser({
    //   openid,
    //   unionid,
    //   nickname: userInfo.nickname,
    //   avatar: userInfo.headimgurl
    // });
    
    // 生成 session token
    const token = generateSessionToken({ openid, unionid });
    
    // 设置 cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 天
    });
    
    // 重定向到首页
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('WeChat login error:', error);
    res.redirect('/login?error=wechat_login_failed');
  }
});

// 生成 session token
function generateSessionToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
  
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(data)
    .digest('hex');
  
  return `${Buffer.from(data).toString('base64')}.${signature}`;
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## 常见问题

### Q1: 提示"该链接无法访问"？

**原因：**
- redirect_uri 的域名与审核时填写的授权域名不一致
- scope 不是 `snsapi_login`
- AppID 错误

**解决：** 检查参数是否正确，确保 redirect_uri 已正确 URL 编码。

### Q2: 获取 access_token 失败？

**原因：**
- code 已被使用（code 只能使用一次）
- code 已过期（10 分钟有效期）
- AppSecret 错误

**解决：** 重新发起授权流程获取新的 code。

### Q3: 如何区分不同应用的用户？

**答案：** 使用 `unionid`。同一微信开放平台账号下的不同应用，同一用户的 unionid 相同。

### Q4: 如何刷新 access_token？

**答案：** 使用 refresh_token 调用刷新接口：

```
https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=APPID&grant_type=refresh_token&refresh_token=REFRESH_TOKEN
```

### Q5: 二维码过期怎么办？

**答案：** 二维码默认 5 分钟有效期，过期后需要重新生成授权 URL。

---

## 参考文档

- [微信开放平台官方文档](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)

---

**文档版本：** v1.0  
**最后更新：** 2024-01-27  
**维护者：** 技术团队
