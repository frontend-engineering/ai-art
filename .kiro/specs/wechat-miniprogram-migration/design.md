# Design Document

## Overview

本设计文档描述了将 AI 全家福 Web 应用前端改造为微信小程序的技术方案。小程序作为独立项目存放在 `miniprogram/` 目录，与原 Web 前端并存，共用同一套后端服务。

设计原则：
1. **UI 优先复用**：优先复用原网页的 UI 设计风格和样式代码
2. **功能完全一致**：小程序功能与原 Web 前端完全一致
3. **微信 SDK 替代**：使用微信小程序 SDK 替代 Web API（如 wx.request 替代 fetch）
4. **原生组件备选**：仅当原网页样式无法直接复用时，使用小程序原生组件

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    微信小程序前端                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │ Components  │  │   Utils     │         │
│  │  (页面层)    │  │  (组件层)    │  │  (工具层)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────┴────────────────┴────────────────┴──────┐         │
│  │              App (全局状态管理)                 │         │
│  └───────────────────────┬───────────────────────┘         │
├──────────────────────────┼──────────────────────────────────┤
│                          │                                  │
│  ┌───────────────────────┴───────────────────────┐         │
│  │           微信小程序 SDK                        │         │
│  │  wx.request | wx.uploadFile | wx.login        │         │
│  │  wx.requestPayment | wx.saveImageToPhotosAlbum│         │
│  └───────────────────────┬───────────────────────┘         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端服务 (不变)                            │
│  /api/user | /api/generate-art-photo | /api/payment        │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
miniprogram/
├── app.js                    # 小程序入口，全局状态管理
├── app.json                  # 小程序配置，页面路由
├── app.wxss                  # 全局样式（复用原网页配色）
├── project.config.json       # 项目配置
├── sitemap.json              # 小程序索引配置
│
├── pages/                    # 页面目录
│   ├── launch/               # 启动页
│   │   ├── launch.js
│   │   ├── launch.json
│   │   ├── launch.wxml
│   │   └── launch.wxss
│   │
│   ├── puzzle/               # 时空拼图模式
│   │   ├── launch/           # 模式启动页
│   │   ├── upload/           # 上传页
│   │   ├── template/         # 模板选择页
│   │   ├── generating/       # 生成中页
│   │   ├── result-selector/  # 结果选择页
│   │   └── result/           # 结果详情页
│   │
│   ├── transform/            # 富贵变身模式
│   │   ├── launch/
│   │   ├── upload/
│   │   ├── template/
│   │   ├── generating/
│   │   ├── result-selector/
│   │   ├── result/
│   │   └── history/          # 历史记录页
│   │
│   └── card-editor/          # 贺卡编辑页
│
├── components/               # 自定义组件
│   ├── background/           # 背景组件
│   ├── corner-background/    # 角落背景组件
│   ├── four-grid-selector/   # 四宫格选择器
│   ├── payment-modal/        # 支付弹窗
│   ├── product-recommendation/ # 产品推荐
│   ├── music-toggle/         # 音乐控制
│   ├── loading/              # 加载动画
│   ├── fireworks/            # 烟花动画
│   └── elder-mode-toggle/    # 老年模式切换
│
├── utils/                    # 工具函数
│   ├── request.js            # HTTP 请求封装
│   ├── api.js                # API 接口定义
│   ├── auth.js               # 登录认证
│   ├── storage.js            # 本地存储
│   ├── upload.js             # 图片上传
│   └── util.js               # 通用工具
│
└── assets/                   # 静态资源
    ├── images/               # 图片资源（从原项目复制）
    └── templates/            # 模板图片
```

## Components and Interfaces

### 1. HTTP 请求封装 (utils/request.js)

```javascript
// 请求封装，替代原 fetch API
const BASE_URL = 'https://api.example.com';

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络不给力，请检查网络连接',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

module.exports = { request, BASE_URL };
```

### 2. API 接口定义 (utils/api.js)

```javascript
const { request } = require('./request');

// 用户相关 API
const userAPI = {
  // 初始化用户
  initUser: (userId) => request({
    url: '/api/user/init',
    method: 'POST',
    data: { userId }
  }),
  
  // 获取用户信息
  getUser: (userId) => request({
    url: `/api/user/${userId}`
  })
};

// 人脸提取 API
const faceAPI = {
  extractFaces: (imageUrls) => request({
    url: '/api/extract-faces',
    method: 'POST',
    data: { imageUrls }
  })
};

// 生成相关 API
const generationAPI = {
  generateArtPhoto: (data) => request({
    url: '/api/generate-art-photo',
    method: 'POST',
    data
  }),
  
  getTaskStatus: (taskId) => request({
    url: `/api/task-status/${taskId}`
  }),
  
  retryTask: (taskId) => request({
    url: `/api/task/${taskId}/retry`,
    method: 'POST'
  })
};

// 支付相关 API
const paymentAPI = {
  createOrder: (data) => request({
    url: '/api/payment/create',
    method: 'POST',
    data
  }),
  
  getWeChatPayParams: (orderId, openid) => request({
    url: '/api/payment/wechat/jsapi',
    method: 'POST',
    data: { orderId, openid }
  })
};

module.exports = { userAPI, faceAPI, generationAPI, paymentAPI };
```

### 3. 登录认证 (utils/auth.js)

```javascript
// 微信登录流程
const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            // 调用后端接口换取 session
            const result = await request({
              url: '/api/wechat/login',
              method: 'POST',
              data: { code: res.code }
            });
            
            // 存储用户信息
            wx.setStorageSync('userId', result.data.userId);
            wx.setStorageSync('token', result.data.token);
            wx.setStorageSync('openid', result.data.openid);
            
            resolve(result.data);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('登录失败'));
        }
      },
      fail: reject
    });
  });
};

// 检查登录状态
const checkLogin = () => {
  const token = wx.getStorageSync('token');
  return !!token;
};

module.exports = { login, checkLogin };
```

### 4. 图片上传 (utils/upload.js)

```javascript
const { BASE_URL } = require('./request');

// 选择图片
const chooseImage = (count = 1) => {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        resolve(res.tempFiles);
      },
      fail: reject
    });
  });
};

// 上传图片到 OSS
const uploadImage = (filePath, onProgress) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    const uploadTask = wx.uploadFile({
      url: BASE_URL + '/api/upload',
      filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const data = JSON.parse(res.data);
          resolve(data.data.url);
        } else {
          reject(new Error('上传失败'));
        }
      },
      fail: reject
    });
    
    // 上传进度回调
    if (onProgress) {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress);
      });
    }
  });
};

module.exports = { chooseImage, uploadImage };
```

### 5. 全局状态管理 (app.js)

```javascript
App({
  globalData: {
    userInfo: null,
    userId: '',
    openid: '',
    isElderMode: false,
    isMusicPlaying: false,
    audioContext: null
  },
  
  onLaunch() {
    // 初始化音频上下文
    this.globalData.audioContext = wx.createInnerAudioContext();
    this.globalData.audioContext.src = '/assets/audio/bgm.mp3';
    this.globalData.audioContext.loop = true;
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 恢复老年模式设置
    const isElderMode = wx.getStorageSync('isElderMode');
    this.globalData.isElderMode = isElderMode || false;
  },
  
  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (!token) {
      await this.login();
    }
  },
  
  async login() {
    const { login } = require('./utils/auth');
    try {
      const result = await login();
      this.globalData.userId = result.userId;
      this.globalData.openid = result.openid;
    } catch (err) {
      console.error('登录失败:', err);
    }
  },
  
  // 切换老年模式
  toggleElderMode() {
    this.globalData.isElderMode = !this.globalData.isElderMode;
    wx.setStorageSync('isElderMode', this.globalData.isElderMode);
  },
  
  // 切换背景音乐
  toggleMusic() {
    if (this.globalData.isMusicPlaying) {
      this.globalData.audioContext.pause();
    } else {
      this.globalData.audioContext.play();
    }
    this.globalData.isMusicPlaying = !this.globalData.isMusicPlaying;
  }
});
```

### 6. 四宫格选择器组件 (components/four-grid-selector)

复用原网页 FourGridSelector 组件的 UI 样式：

```javascript
// four-grid-selector.js
Component({
  properties: {
    images: {
      type: Array,
      value: []
    },
    selectedImage: {
      type: String,
      value: ''
    }
  },
  
  methods: {
    handleSelect(e) {
      const { url } = e.currentTarget.dataset;
      this.triggerEvent('select', { url });
      
      // 震动反馈
      wx.vibrateShort({ type: 'light' });
    },
    
    handlePreview(e) {
      const { url } = e.currentTarget.dataset;
      wx.previewImage({
        current: url,
        urls: this.data.images
      });
    },
    
    handleConfirm() {
      if (!this.data.selectedImage) {
        wx.showToast({
          title: '请先选择一张图片',
          icon: 'none'
        });
        return;
      }
      this.triggerEvent('confirm', { url: this.data.selectedImage });
    }
  }
});
```

```xml
<!-- four-grid-selector.wxml -->
<view class="grid-container">
  <view 
    wx:for="{{images}}" 
    wx:key="index"
    class="grid-item {{selectedImage === item ? 'selected' : ''}}"
    bindtap="handleSelect"
    data-url="{{item}}"
  >
    <!-- 金色边框 -->
    <view class="border-wrapper">
      <image 
        src="{{item}}" 
        mode="aspectFill"
        class="grid-image"
        bindlongpress="handlePreview"
        data-url="{{item}}"
      />
      
      <!-- 选中标记 -->
      <view wx:if="{{selectedImage === item}}" class="check-mark">
        <text class="check-icon">✓</text>
      </view>
    </view>
  </view>
</view>

<!-- 确认按钮 -->
<view class="confirm-wrapper">
  <button 
    class="confirm-btn {{selectedImage ? 'active' : 'disabled'}}"
    bindtap="handleConfirm"
  >
    <text class="btn-text">确认选择</text>
  </button>
</view>
```

```css
/* four-grid-selector.wxss - 复用原网页样式 */
.grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  padding: 24rpx;
}

.grid-item {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  transition: all 0.3s;
}

.grid-item.selected {
  transform: scale(1.02);
}

.border-wrapper {
  position: relative;
  padding: 4rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #FFD700, #FFC700, #FFD700);
}

.grid-item.selected .border-wrapper {
  box-shadow: 0 8rpx 32rpx rgba(255, 215, 0, 0.4);
}

.grid-image {
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 20rpx;
  display: block;
}

.check-mark {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #D4302B, #8B0000);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #FFD700;
}

.check-icon {
  color: #FFD700;
  font-size: 24rpx;
  font-weight: bold;
}

.confirm-wrapper {
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.confirm-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.confirm-btn.active {
  background: linear-gradient(135deg, #D4302B, #8B0000);
  border: 4rpx solid #FFD700;
}

.confirm-btn.disabled {
  background: #999;
  opacity: 0.5;
}

.btn-text {
  color: #FFD700;
  font-size: 32rpx;
  font-weight: bold;
}
```

### 7. 支付弹窗组件 (components/payment-modal)

```javascript
// payment-modal.js
const { paymentAPI } = require('../../utils/api');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    generationId: {
      type: String,
      value: ''
    }
  },
  
  data: {
    selectedPackage: 'basic',
    packages: [
      { id: 'free', name: '免费版', price: 0, features: ['标清带水印', '限2人合成'] },
      { id: 'basic', name: '尝鲜包', price: 9.9, originalPrice: 19.9, features: ['高清无水印', '3-5人合成', '热门模板'] },
      { id: 'premium', name: '尊享包', price: 29.9, features: ['4K原图', '微动态', '贺卡', '全模板'], recommended: true }
    ],
    isPaying: false
  },
  
  methods: {
    selectPackage(e) {
      const { id } = e.currentTarget.dataset;
      this.setData({ selectedPackage: id });
    },
    
    async handlePay() {
      if (this.data.isPaying) return;
      
      const app = getApp();
      const { selectedPackage } = this.data;
      
      if (selectedPackage === 'free') {
        this.triggerEvent('complete', { packageType: 'free' });
        return;
      }
      
      this.setData({ isPaying: true });
      
      try {
        // 创建订单
        const orderResult = await paymentAPI.createOrder({
          userId: app.globalData.userId,
          generationId: this.data.generationId,
          packageType: selectedPackage
        });
        
        // 获取支付参数
        const payParams = await paymentAPI.getWeChatPayParams(
          orderResult.data.orderId,
          app.globalData.openid
        );
        
        // 发起微信支付
        await this.requestPayment(payParams.data);
        
        // 支付成功
        wx.showToast({ title: '支付成功', icon: 'success' });
        this.triggerEvent('complete', { packageType: selectedPackage });
        
      } catch (err) {
        if (err.errMsg !== 'requestPayment:fail cancel') {
          wx.showToast({ title: '支付失败，请重试', icon: 'none' });
        }
      } finally {
        this.setData({ isPaying: false });
      }
    },
    
    requestPayment(params) {
      return new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
          success: resolve,
          fail: reject
        });
      });
    },
    
    handleClose() {
      this.triggerEvent('close');
    }
  }
});
```

## Data Models

### 用户数据模型

```javascript
// 用户信息
const User = {
  id: String,           // 用户ID
  openid: String,       // 微信openid
  created_at: String,   // 创建时间
  updated_at: String,   // 更新时间
  payment_status: String, // 付费状态: 'free' | 'basic' | 'premium'
  regenerate_count: Number // 剩余重新生成次数
};
```

### 任务数据模型

```javascript
// 生成任务
const Task = {
  taskId: String,       // 任务ID
  userId: String,       // 用户ID
  status: String,       // 状态: 'pending' | 'processing' | 'completed' | 'failed'
  progress: Number,     // 进度 0-100
  message: String,      // 状态消息
  result: {
    images: Array,      // 生成的图片URL数组
    generatedAt: String // 生成时间
  },
  retryCount: Number,   // 重试次数
  maxRetries: Number    // 最大重试次数
};
```

### 历史记录数据模型

```javascript
// 历史记录项
const HistoryItem = {
  id: String,           // 记录ID
  originalImages: Array, // 原始图片URL数组
  generatedImage: String, // 生成的图片URL
  createdAt: String,    // 创建时间
  isPaid: Boolean,      // 是否已付费
  mode: String          // 模式: 'puzzle' | 'transform'
};
```

## 微信登录完整流程设计

### 前后端协同登录流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  小程序前端  │     │   后端服务   │     │  微信服务器  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. wx.login()    │                   │
       │ ─────────────────────────────────────>│
       │                   │                   │
       │  2. 返回 code     │                   │
       │ <─────────────────────────────────────│
       │                   │                   │
       │  3. POST /api/wechat/login {code}     │
       │ ─────────────────>│                   │
       │                   │                   │
       │                   │  4. code2Session  │
       │                   │ ─────────────────>│
       │                   │                   │
       │                   │  5. openid, session_key
       │                   │ <─────────────────│
       │                   │                   │
       │                   │  6. 创建/查找用户  │
       │                   │  生成 JWT token   │
       │                   │                   │
       │  7. 返回 {userId, token, openid}      │
       │ <─────────────────│                   │
       │                   │                   │
       │  8. 存储到本地    │                   │
       │  wx.setStorageSync│                   │
       │                   │                   │
```

### 后端登录接口设计 (需要后端新增)

```javascript
// 后端新增接口: POST /api/wechat/login
// backend/routes/wechatRoutes.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// 微信小程序登录
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少登录凭证 code'
      });
    }
    
    // 调用微信 code2Session 接口
    const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WECHAT_APPID,
        secret: process.env.WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });
    
    const { openid, session_key, errcode, errmsg } = wxResponse.data;
    
    if (errcode) {
      return res.status(400).json({
        success: false,
        message: errmsg || '微信登录失败'
      });
    }
    
    // 查找或创建用户
    let user = await User.findOne({ where: { openid } });
    
    if (!user) {
      user = await User.create({
        id: generateUserId(),
        openid,
        payment_status: 'free',
        regenerate_count: 3
      });
    }
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, openid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        openid,
        token,
        paymentStatus: user.payment_status
      }
    });
    
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请重试'
    });
  }
});

module.exports = router;
```

### 小程序端完整登录实现 (utils/auth.js)

```javascript
const { request } = require('./request');

// 微信登录完整流程
const login = () => {
  return new Promise((resolve, reject) => {
    // 1. 调用 wx.login 获取 code
    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('获取登录凭证失败'));
          return;
        }
        
        console.log('[Auth] 获取到 code:', loginRes.code);
        
        try {
          // 2. 调用后端接口换取 session
          const result = await request({
            url: '/api/wechat/login',
            method: 'POST',
            data: { code: loginRes.code }
          });
          
          if (!result.success) {
            throw new Error(result.message || '登录失败');
          }
          
          const { userId, openid, token, paymentStatus } = result.data;
          
          // 3. 存储用户信息到本地
          wx.setStorageSync('userId', userId);
          wx.setStorageSync('openid', openid);
          wx.setStorageSync('token', token);
          wx.setStorageSync('paymentStatus', paymentStatus);
          
          console.log('[Auth] 登录成功:', { userId, openid });
          
          resolve(result.data);
          
        } catch (err) {
          console.error('[Auth] 登录失败:', err);
          reject(err);
        }
      },
      fail: (err) => {
        console.error('[Auth] wx.login 失败:', err);
        reject(new Error('微信登录失败'));
      }
    });
  });
};

// 检查登录状态
const checkLogin = () => {
  const token = wx.getStorageSync('token');
  const userId = wx.getStorageSync('userId');
  return !!(token && userId);
};

// 获取用户信息
const getUserInfo = () => {
  return {
    userId: wx.getStorageSync('userId'),
    openid: wx.getStorageSync('openid'),
    token: wx.getStorageSync('token'),
    paymentStatus: wx.getStorageSync('paymentStatus')
  };
};

// 退出登录
const logout = () => {
  wx.removeStorageSync('userId');
  wx.removeStorageSync('openid');
  wx.removeStorageSync('token');
  wx.removeStorageSync('paymentStatus');
};

// 刷新 token（当 token 过期时调用）
const refreshToken = async () => {
  // 重新登录获取新 token
  return await login();
};

module.exports = { login, checkLogin, getUserInfo, logout, refreshToken };
```

## 微信分享完整设计

### 分享能力概述

小程序支持以下分享方式：
1. **分享给好友** - 通过 `onShareAppMessage` 分享小程序卡片
2. **分享到朋友圈** - 通过 `onShareTimeline` 分享到朋友圈
3. **生成分享海报** - 使用 Canvas 绘制带小程序码的海报图片

### 分享工具函数 (utils/share.js)

```javascript
// 分享配置
const shareConfig = {
  title: 'AI全家福·团圆照相馆',
  desc: '这个春节，让爱没有距离！看看我生成的AI全家福 🎊',
  path: '/pages/launch/launch'
};

// 生成分享给好友的配置
const getShareAppMessage = (options = {}) => {
  const { imageUrl, title, path } = options;
  
  return {
    title: title || shareConfig.title,
    path: path || shareConfig.path,
    imageUrl: imageUrl || '/assets/images/share-default.png'
  };
};

// 生成分享到朋友圈的配置
const getShareTimeline = (options = {}) => {
  const { imageUrl, title } = options;
  
  return {
    title: title || shareConfig.title,
    imageUrl: imageUrl || '/assets/images/share-default.png'
  };
};

// 生成分享海报
const generateSharePoster = (options) => {
  return new Promise((resolve, reject) => {
    const { imageUrl, qrCodeUrl, canvasId } = options;
    
    const ctx = wx.createCanvasContext(canvasId);
    const canvasWidth = 750;
    const canvasHeight = 1334;
    
    // 绘制背景
    ctx.setFillStyle('#FFF8F0');
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 绘制顶部装饰
    ctx.setFillStyle('#D4302B');
    ctx.fillRect(0, 0, canvasWidth, 120);
    
    // 绘制标题
    ctx.setFillStyle('#FFD700');
    ctx.setFontSize(48);
    ctx.setTextAlign('center');
    ctx.fillText('AI全家福·团圆照相馆', canvasWidth / 2, 80);
    
    // 绘制生成的图片
    ctx.drawImage(imageUrl, 50, 150, 650, 650);
    
    // 绘制金色边框
    ctx.setStrokeStyle('#FFD700');
    ctx.setLineWidth(8);
    ctx.strokeRect(46, 146, 658, 658);
    
    // 绘制底部文案
    ctx.setFillStyle('#8B4513');
    ctx.setFontSize(36);
    ctx.fillText('这个春节，让爱没有距离', canvasWidth / 2, 880);
    
    // 绘制小程序码
    if (qrCodeUrl) {
      ctx.drawImage(qrCodeUrl, 275, 920, 200, 200);
    }
    
    // 绘制扫码提示
    ctx.setFillStyle('#666');
    ctx.setFontSize(28);
    ctx.fillText('长按识别小程序码', canvasWidth / 2, 1180);
    ctx.fillText('制作你的AI全家福', canvasWidth / 2, 1220);
    
    ctx.draw(false, () => {
      // 导出图片
      wx.canvasToTempFilePath({
        canvasId,
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: reject
      });
    });
  });
};

// 保存海报到相册
const savePosterToAlbum = (tempFilePath) => {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        resolve();
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          // 用户拒绝授权，引导开启
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
        reject(err);
      }
    });
  });
};

module.exports = {
  shareConfig,
  getShareAppMessage,
  getShareTimeline,
  generateSharePoster,
  savePosterToAlbum
};
```

### 页面分享配置示例 (pages/result/result.js)

```javascript
const { getShareAppMessage, getShareTimeline, generateSharePoster, savePosterToAlbum } = require('../../utils/share');

Page({
  data: {
    selectedImage: '',
    showShareModal: false,
    posterPath: ''
  },
  
  // 分享给好友
  onShareAppMessage() {
    return getShareAppMessage({
      title: '看看我生成的AI全家福 🎊',
      imageUrl: this.data.selectedImage,
      path: `/pages/launch/launch?shareFrom=result`
    });
  },
  
  // 分享到朋友圈
  onShareTimeline() {
    return getShareTimeline({
      title: 'AI全家福·团圆照相馆 - 这个春节，让爱没有距离',
      imageUrl: this.data.selectedImage
    });
  },
  
  // 显示分享弹窗
  showShareOptions() {
    this.setData({ showShareModal: true });
  },
  
  // 生成并保存海报
  async handleSavePoster() {
    wx.showLoading({ title: '生成海报中...' });
    
    try {
      // 获取小程序码
      const qrCodeUrl = await this.getQRCode();
      
      // 生成海报
      const posterPath = await generateSharePoster({
        imageUrl: this.data.selectedImage,
        qrCodeUrl,
        canvasId: 'posterCanvas'
      });
      
      // 保存到相册
      await savePosterToAlbum(posterPath);
      
      this.setData({ showShareModal: false });
      
    } catch (err) {
      console.error('生成海报失败:', err);
      wx.showToast({
        title: '生成海报失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  // 获取小程序码
  async getQRCode() {
    // 调用后端接口获取小程序码
    const { request } = require('../../utils/request');
    const result = await request({
      url: '/api/wechat/qrcode',
      method: 'POST',
      data: {
        path: 'pages/launch/launch',
        width: 200
      }
    });
    return result.data.qrCodeUrl;
  },
  
  // 分享给好友（触发原生分享）
  handleShareToFriend() {
    // 小程序会自动调用 onShareAppMessage
    this.setData({ showShareModal: false });
  }
});
```

### 分享弹窗组件 (components/share-modal)

```xml
<!-- share-modal.wxml -->
<view class="share-modal {{visible ? 'show' : ''}}" catchtouchmove="preventMove">
  <view class="share-mask" bindtap="handleClose"></view>
  
  <view class="share-content">
    <!-- 顶部装饰 -->
    <view class="share-header">
      <text class="share-title">分享给家人朋友</text>
    </view>
    
    <!-- 分享选项 -->
    <view class="share-options">
      <!-- 分享给好友 -->
      <button class="share-option" open-type="share">
        <view class="option-icon wechat-icon">
          <text class="icon-text">💬</text>
        </view>
        <text class="option-text">微信好友</text>
      </button>
      
      <!-- 分享到朋友圈 -->
      <button class="share-option" bindtap="handleShareTimeline">
        <view class="option-icon moments-icon">
          <text class="icon-text">🌐</text>
        </view>
        <text class="option-text">朋友圈</text>
      </button>
      
      <!-- 生成海报 -->
      <button class="share-option" bindtap="handleSavePoster">
        <view class="option-icon poster-icon">
          <text class="icon-text">🖼️</text>
        </view>
        <text class="option-text">保存海报</text>
      </button>
    </view>
    
    <!-- 取消按钮 -->
    <view class="share-cancel" bindtap="handleClose">
      <text>取消</text>
    </view>
  </view>
</view>
```

```css
/* share-modal.wxss */
.share-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  visibility: hidden;
  opacity: 0;
  transition: all 0.3s;
}

.share-modal.show {
  visibility: visible;
  opacity: 1;
}

.share-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
}

.share-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #FFF8F0, #FFFFFF);
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s;
}

.share-modal.show .share-content {
  transform: translateY(0);
}

.share-header {
  text-align: center;
  padding-bottom: 32rpx;
  border-bottom: 2rpx solid #FFD700;
}

.share-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #D4302B;
}

.share-options {
  display: flex;
  justify-content: space-around;
  padding: 48rpx 0;
}

.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  border: none;
  padding: 0;
}

.share-option::after {
  border: none;
}

.option-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.wechat-icon {
  background: linear-gradient(135deg, #07C160, #06AD56);
}

.moments-icon {
  background: linear-gradient(135deg, #FFD700, #FFC700);
}

.poster-icon {
  background: linear-gradient(135deg, #D4302B, #8B0000);
}

.icon-text {
  font-size: 48rpx;
}

.option-text {
  font-size: 28rpx;
  color: #333;
}

.share-cancel {
  text-align: center;
  padding: 24rpx;
  color: #666;
  font-size: 32rpx;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Request Authentication Token

*For any* HTTP request to an authenticated API endpoint, the request header SHALL contain a valid user token if the user is logged in.

**Validates: Requirements 4.3**

### Property 2: Error Response Handling

*For any* API request that returns an error response, the Mini_Program SHALL display a user-friendly error message (not raw error codes or technical messages).

**Validates: Requirements 4.4, 12.1**

### Property 3: User Session Persistence

*For any* successful login operation, the user information (userId, token, openid) SHALL be stored in local storage and retrievable in subsequent sessions.

**Validates: Requirements 5.3**

### Property 4: Image Selection Limit

*For any* image selection operation in puzzle mode, the number of selected images SHALL NOT exceed 5.

**Validates: Requirements 6.2**

### Property 5: Image Compression Before Upload

*For any* image upload operation, the image SHALL be compressed before being sent to the server.

**Validates: Requirements 6.3**

### Property 6: History Record Deletion

*For any* history record deletion operation, the deleted record SHALL NOT appear in subsequent history list queries.

**Validates: Requirements 11.4**

## Error Handling

### 网络错误处理

```javascript
// utils/request.js 中的错误处理
const handleError = (error) => {
  // 网络错误
  if (error.errMsg && error.errMsg.includes('request:fail')) {
    wx.showToast({
      title: '网络不给力，请检查网络连接',
      icon: 'none',
      duration: 3000
    });
    return;
  }
  
  // 服务器错误
  if (error.statusCode >= 500) {
    wx.showToast({
      title: '服务器开小差了，请稍后重试',
      icon: 'none',
      duration: 3000
    });
    return;
  }
  
  // 业务错误
  if (error.message) {
    wx.showToast({
      title: error.message,
      icon: 'none',
      duration: 3000
    });
  }
};
```

### 人脸检测错误处理

```javascript
// 人脸检测失败时的友好提示
const handleFaceDetectionError = (error) => {
  const errorMessages = {
    'no_face': '照片里人脸太小啦，选一张正面大头像吧',
    'multiple_faces': '检测到多张人脸，请确保照片中只有一个人',
    'blur': '照片有点模糊，换一张清晰的试试',
    'default': '人脸检测失败，请重新上传'
  };
  
  const message = errorMessages[error.code] || errorMessages.default;
  
  wx.showModal({
    title: '提示',
    content: message,
    showCancel: false,
    confirmText: '重新上传'
  });
};
```

### 支付错误处理

```javascript
// 支付失败时的处理
const handlePaymentError = (error) => {
  if (error.errMsg === 'requestPayment:fail cancel') {
    // 用户取消支付，不显示错误
    return;
  }
  
  wx.showModal({
    title: '支付失败',
    content: '支付未完成，请重试',
    confirmText: '重试',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        // 重试支付
        this.handlePay();
      }
    }
  });
};
```

## Testing Strategy

### 单元测试

由于微信小程序的特殊性，单元测试主要针对工具函数和业务逻辑：

1. **工具函数测试**
   - request.js 的请求封装逻辑
   - storage.js 的存储操作
   - util.js 的通用工具函数

2. **业务逻辑测试**
   - 图片选择数量限制
   - 历史记录的增删改查
   - 任务状态轮询逻辑

### 属性测试

使用 miniprogram-simulate 或类似工具进行属性测试：

```javascript
// 示例：图片选择数量限制属性测试
describe('Image Selection Limit Property', () => {
  it('should not allow more than 5 images in puzzle mode', () => {
    // 生成随机数量的图片（1-10张）
    const imageCount = Math.floor(Math.random() * 10) + 1;
    const images = Array(imageCount).fill('test-image.jpg');
    
    const result = selectImages(images, 'puzzle');
    
    // 验证选择的图片数量不超过5张
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
```

### 集成测试

1. **登录流程测试**
   - 验证微信登录 → 后端换取 session → 本地存储的完整流程

2. **图片上传流程测试**
   - 验证选择图片 → 压缩 → 上传 → 人脸检测的完整流程

3. **支付流程测试**
   - 验证创建订单 → 获取支付参数 → 发起支付 → 更新状态的完整流程

### 手动测试清单

由于小程序的 UI 测试难以自动化，以下功能需要手动测试：

- [ ] 启动页展示和跳转
- [ ] 时空拼图模式完整流程
- [ ] 富贵变身模式完整流程
- [ ] 贺卡编辑功能
- [ ] 支付弹窗和支付流程
- [ ] 图片保存到相册
- [ ] 分享功能
- [ ] 老年模式切换
- [ ] 背景音乐控制
- [ ] 历史记录查看和删除
