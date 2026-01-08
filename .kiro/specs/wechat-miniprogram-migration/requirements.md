# Requirements Document

## Introduction

本文档定义了为 AI 全家福项目创建微信小程序前端的需求。小程序作为独立的新前端项目，存放在 `miniprogram/` 目录下，与原有 Web 前端（`src/` 目录）并存互不影响。服务端接口和功能保持不变，小程序前端的功能与原 Web 前端完全一致。

### 项目结构

```
ai-art/
├── src/                    # 原有 Web 前端（React + Vite）
├── miniprogram/            # 新增微信小程序前端
│   ├── pages/              # 小程序页面
│   ├── components/         # 小程序组件
│   ├── utils/              # 工具函数
│   ├── assets/             # 静态资源
│   ├── app.js              # 小程序入口
│   ├── app.json            # 小程序配置
│   ├── app.wxss            # 全局样式
│   └── project.config.json # 项目配置
├── backend/                # 后端服务（不变）
└── ...
```

## Glossary

- **Mini_Program**: 微信小程序，运行在微信客户端内的轻量级应用
- **WXML**: 微信小程序的模板语言，类似 HTML
- **WXSS**: 微信小程序的样式语言，类似 CSS
- **WXS**: 微信小程序的脚本语言，用于在视图层进行数据处理
- **API_Service**: 后端服务接口，保持不变
- **Page**: 小程序页面，对应原 React 路由页面
- **Component**: 小程序自定义组件，对应原 React 组件
- **App_Context**: 小程序全局状态管理，对应原 React Context

## Requirements

### Requirement 1: 小程序项目初始化

**User Story:** As a 开发者, I want 创建标准的微信小程序项目结构, so that 可以在微信开发者工具中正常开发和预览。

#### Acceptance Criteria

1. THE Mini_Program SHALL 使用标准的微信小程序目录结构（pages、components、utils、assets）
2. THE Mini_Program SHALL 配置 app.json 定义所有页面路由和全局配置
3. THE Mini_Program SHALL 配置 project.config.json 定义项目编译和开发设置
4. THE Mini_Program SHALL 在 app.wxss 中定义全局样式（中国红主色、金色辅色、暖白背景）

### Requirement 2: 页面路由迁移

**User Story:** As a 用户, I want 在小程序中访问所有原有页面功能, so that 可以完成 AI 全家福的完整流程。

#### Acceptance Criteria

1. THE Mini_Program SHALL 包含启动页（pages/launch/launch）
2. THE Mini_Program SHALL 包含时空拼图模式页面（puzzle/launch、puzzle/upload、puzzle/template、puzzle/generating、puzzle/result-selector、puzzle/result）
3. THE Mini_Program SHALL 包含富贵变身模式页面（transform/launch、transform/upload、transform/template、transform/generating、transform/result-selector、transform/result、transform/history）
4. THE Mini_Program SHALL 包含贺卡编辑页（pages/card-editor/card-editor）
5. WHEN 用户点击导航按钮 THEN Mini_Program SHALL 使用 wx.navigateTo 或 wx.redirectTo 进行页面跳转

### Requirement 3: 组件迁移

**User Story:** As a 开发者, I want 将 React 组件转换为小程序自定义组件, so that 可以复用 UI 逻辑。

#### Acceptance Criteria

1. THE Mini_Program SHALL 优先将原 React 组件的 UI 结构和样式转换为小程序组件
2. THE Mini_Program SHALL 包含 Background 组件用于页面背景渲染（复用原网页样式）
3. THE Mini_Program SHALL 包含 FourGridSelector 组件用于四宫格图片选择（复用原网页样式）
4. THE Mini_Program SHALL 包含 PaymentModal 组件用于支付弹窗（复用原网页样式）
5. THE Mini_Program SHALL 包含 ImagePreviewModal 组件用于图片预览（可使用 wx.previewImage 作为备选）
6. THE Mini_Program SHALL 包含 MusicToggle 组件用于背景音乐控制（复用原网页样式）
7. THE Mini_Program SHALL 包含 Loading 组件用于加载状态展示（复用原网页灯笼动画样式）
8. THE Mini_Program SHALL 包含 Toast 组件用于消息提示（可使用 wx.showToast 作为备选）
9. WHEN 基础功能组件需要成熟稳定的实现 THEN Mini_Program MAY 使用小程序原生组件

### Requirement 4: API 服务对接

**User Story:** As a 用户, I want 小程序能正常调用后端接口, so that 可以完成图片上传、生成、支付等功能。

#### Acceptance Criteria

1. THE Mini_Program SHALL 使用 wx.request 封装 HTTP 请求工具
2. THE Mini_Program SHALL 配置 API 基础地址和请求拦截器
3. WHEN 调用需要认证的接口 THEN Mini_Program SHALL 在请求头中携带用户 token
4. WHEN 接口返回错误 THEN Mini_Program SHALL 显示友好的错误提示
5. THE Mini_Program SHALL 支持图片上传接口（wx.uploadFile）
6. THE Mini_Program SHALL 支持任务状态轮询接口

### Requirement 5: 微信登录集成

**User Story:** As a 用户, I want 使用微信一键登录, so that 无需手动注册即可使用服务。

#### Acceptance Criteria

1. WHEN 用户首次进入小程序 THEN Mini_Program SHALL 自动获取微信登录 code
2. THE Mini_Program SHALL 调用后端接口换取用户 session
3. THE Mini_Program SHALL 将用户信息存储在本地缓存（wx.setStorageSync）
4. WHEN 用户 session 过期 THEN Mini_Program SHALL 自动重新登录

### Requirement 6: 图片上传功能

**User Story:** As a 用户, I want 从相册选择或拍照上传照片, so that 可以生成 AI 全家福。

#### Acceptance Criteria

1. THE Mini_Program SHALL 使用 wx.chooseMedia 选择图片或拍照
2. THE Mini_Program SHALL 支持多图选择（时空拼图模式最多5张）
3. THE Mini_Program SHALL 在上传前进行图片压缩（wx.compressImage）
4. THE Mini_Program SHALL 显示上传进度
5. WHEN 图片上传失败 THEN Mini_Program SHALL 显示错误提示并支持重试

### Requirement 7: 微信支付集成

**User Story:** As a 用户, I want 使用微信支付购买套餐, so that 可以解锁高清图片和更多功能。

#### Acceptance Criteria

1. THE Mini_Program SHALL 调用后端接口获取微信支付参数
2. THE Mini_Program SHALL 使用 wx.requestPayment 发起支付
3. WHEN 支付成功 THEN Mini_Program SHALL 更新用户套餐状态并刷新页面
4. WHEN 支付失败或取消 THEN Mini_Program SHALL 显示相应提示

### Requirement 8: 图片保存与分享

**User Story:** As a 用户, I want 保存生成的图片到相册并分享给好友, so that 可以展示和传播作品。

#### Acceptance Criteria

1. THE Mini_Program SHALL 使用 wx.saveImageToPhotosAlbum 保存图片到相册
2. WHEN 用户未授权相册权限 THEN Mini_Program SHALL 引导用户开启权限
3. THE Mini_Program SHALL 支持生成分享海报（带小程序码）
4. THE Mini_Program SHALL 支持分享到微信好友和朋友圈

### Requirement 9: 全局状态管理

**User Story:** As a 开发者, I want 管理全局状态（用户信息、音乐播放、老年模式）, so that 各页面可以共享状态。

#### Acceptance Criteria

1. THE Mini_Program SHALL 在 app.js 中定义全局数据（globalData）
2. THE Mini_Program SHALL 提供获取和更新全局状态的方法
3. THE Mini_Program SHALL 支持老年模式切换（字体放大、按钮放大）
4. THE Mini_Program SHALL 支持背景音乐播放控制（wx.createInnerAudioContext）

### Requirement 10: UI 样式适配

**User Story:** As a 用户, I want 小程序界面保持原有的春节喜庆风格, so that 获得一致的视觉体验。

#### Acceptance Criteria

1. THE Mini_Program SHALL 优先复用原网页的 UI 设计风格和样式代码
2. THE Mini_Program SHALL 使用 rpx 单位将原 CSS 样式转换为小程序响应式布局
3. THE Mini_Program SHALL 保持中国红（#D4302B）、金色（#D4AF37）、暖白（#FFF8F0）配色
4. THE Mini_Program SHALL 复用原网页的页面布局结构和组件层级
5. THE Mini_Program SHALL 复用原网页的动画效果（使用小程序 animation API 实现）
6. THE Mini_Program SHALL 支持安全区域适配（底部导航栏、刘海屏）
7. THE Mini_Program SHALL 实现灯笼、烟花等节日元素动画
8. WHEN 原网页样式无法直接复用 THEN Mini_Program SHALL 使用小程序原生组件作为备选方案

### Requirement 11: 历史记录功能

**User Story:** As a 用户, I want 查看我的生成历史, so that 可以重新下载或分享之前的作品。

#### Acceptance Criteria

1. THE Mini_Program SHALL 展示用户的生成历史列表
2. THE Mini_Program SHALL 支持点击历史记录查看详情
3. THE Mini_Program SHALL 支持从历史记录重新下载图片
4. THE Mini_Program SHALL 支持删除历史记录

### Requirement 12: 错误处理与用户反馈

**User Story:** As a 用户, I want 在操作出错时获得清晰的提示, so that 知道如何解决问题。

#### Acceptance Criteria

1. WHEN 网络请求失败 THEN Mini_Program SHALL 显示"网络不给力，请检查网络连接"
2. WHEN 人脸检测失败 THEN Mini_Program SHALL 显示"照片里人脸太小啦，选一张正面大头像吧"
3. WHEN 生成任务失败 THEN Mini_Program SHALL 显示"生成失败，点击重试"并支持一键重试
4. THE Mini_Program SHALL 使用 wx.showToast 和 wx.showModal 展示提示信息

### Requirement 13: 贺卡编辑功能

**User Story:** As a 用户, I want 将生成的图片制作成拜年贺卡, so that 可以发送给亲友。

#### Acceptance Criteria

1. THE Mini_Program SHALL 提供贺卡编辑页面
2. THE Mini_Program SHALL 支持自定义祝福语文字
3. THE Mini_Program SHALL 提供多种贺卡模板样式
4. THE Mini_Program SHALL 支持预览贺卡效果
5. THE Mini_Program SHALL 支持保存和分享贺卡

### Requirement 14: 任务轮询与进度展示

**User Story:** As a 用户, I want 看到生成进度和状态, so that 知道还需要等待多久。

#### Acceptance Criteria

1. THE Mini_Program SHALL 轮询后端任务状态接口
2. THE Mini_Program SHALL 展示进度百分比和阶段文案
3. THE Mini_Program SHALL 展示灯笼旋转动画作为等待提示
4. WHEN 任务完成 THEN Mini_Program SHALL 自动跳转到结果页
5. WHEN 任务失败 THEN Mini_Program SHALL 显示错误信息和重试按钮

### Requirement 15: 四宫格结果选择

**User Story:** As a 用户, I want 从多张生成结果中选择最满意的一张, so that 可以获得最佳效果。

#### Acceptance Criteria

1. THE Mini_Program SHALL 以四宫格形式展示生成的图片
2. THE Mini_Program SHALL 支持点击图片放大预览
3. THE Mini_Program SHALL 高亮显示选中的图片
4. WHEN 用户确认选择 THEN Mini_Program SHALL 跳转到结果详情页

### Requirement 16: 产品推荐与订购

**User Story:** As a 用户, I want 将生成的图片定制成实体产品, so that 可以作为纪念品保存。

#### Acceptance Criteria

1. THE Mini_Program SHALL 展示晶瓷画、卷轴等产品选项
2. THE Mini_Program SHALL 显示产品价格和预览效果
3. THE Mini_Program SHALL 支持填写收货地址信息
4. THE Mini_Program SHALL 调用后端接口创建产品订单
