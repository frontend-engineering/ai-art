# Live Photo 微动态功能说明

## 功能概述

Live Photo 微动态功能已成功集成到小程序的时空拼图和富贵变身两个模式的结果页中。该功能为尊享包用户提供将静态图片转换为动态视频的能力。

## 功能特性

### 1. 用户权限
- **免费用户**: 可查看功能入口，点击后提示升级套餐
- **尊享包用户**: 完整使用微动态生成和保存功能

### 2. 核心功能
- ✅ 生成微动态视频（5秒动态效果）
- ✅ 实时进度显示（0-100%）
- ✅ 自动播放预览（首次生成后自动播放5秒）
- ✅ 点击 Live 标识切换播放/暂停
- ✅ 保存微动态视频到相册
- ✅ 震动反馈增强交互体验

### 3. UI 设计
- Live Photo 标识（左上角金色徽章）
- 播放时脉动动画效果
- 生成进度卡片（实时显示进度百分比）
- 微动态按钮（橙色=生成，绿色=保存）
- 尊享标签（非会员用户显示）

## 技术实现

### API 接口

#### 1. 生成微动态视频
```javascript
POST /api/generate-video
{
  imageUrl: string,      // 图片URL
  userId: string,        // 用户ID
  motionBucketId: 10,    // 运动幅度
  fps: 10,               // 帧率
  videoLength: 5,        // 视频时长(秒)
  dynamicType: 'festival' // 动态类型
}
```

#### 2. 查询视频任务状态
```javascript
GET /api/video-task-status/:taskId
```

#### 3. 转换为 Live Photo 格式
```javascript
POST /api/convert-to-live-photo
{
  videoUrl: string,  // 视频URL
  userId: string     // 用户ID
}
```

### 前端实现

#### 页面文件
- `miniprogram/pages/puzzle/result/result.js` - 时空拼图结果页
- `miniprogram/pages/transform/result/result.js` - 富贵变身结果页

#### 核心方法
```javascript
// 生成微动态
handleGenerateLivePhoto()

// 轮询任务状态
startVideoPolling(taskId)

// 转换为 Live Photo
convertToLivePhoto(videoUrl)

// 保存到相册
handleSaveLivePhoto()

// 切换播放状态
toggleLivePhoto()

// 自动播放
autoPlayLivePhoto()
```

### 工作流程

```
用户点击"生成微动态"
    ↓
检查用户权限（是否为尊享包）
    ↓
调用生成视频API → 获取taskId
    ↓
开始轮询任务状态（每2秒）
    ↓
更新进度显示（0-90%）
    ↓
视频生成完成 → 调用转换API
    ↓
转换为 Live Photo 格式
    ↓
显示 Live 标识 + 自动播放5秒
    ↓
用户可点击保存到相册
```

## 使用说明

### 用户操作流程

1. **生成结果页**
   - 完成图片生成后进入结果页
   - 看到"生成微动态"按钮（带尊享标签）

2. **生成微动态**
   - 点击"生成微动态"按钮
   - 非会员弹窗提示升级套餐
   - 会员用户开始生成，显示进度

3. **查看微动态**
   - 生成完成后左上角显示 Live 标识
   - 自动播放5秒预览
   - 点击 Live 标识可切换播放/暂停

4. **保存微动态**
   - 按钮变为"保存微动态"（绿色）
   - 点击保存视频到相册
   - 需要授权相册权限

## 注意事项

### 1. 后端依赖
- 需要配置火山引擎视频生成API密钥
- 需要 Python 环境和 FFmpeg（用于视频转换）
- 环境变量：`VOLCENGINE_ACCESS_KEY_ID`、`VOLCENGINE_SECRET_ACCESS_KEY`

### 2. 性能考虑
- 视频生成通常需要30-60秒
- 最多轮询60次（2分钟超时）
- 建议在 WiFi 环境下使用

### 3. 权限管理
- 需要用户授权保存视频到相册
- 首次保存时会弹出授权请求
- 拒绝后可引导用户到设置页开启

### 4. 兼容性
- 小程序基础库版本要求：>= 2.4.0
- video 组件支持 autoplay、loop 等属性
- 支持 wx.saveVideoToPhotosAlbum API

## 测试清单

- [ ] 免费用户点击生成微动态，显示升级提示
- [ ] 尊享包用户成功生成微动态
- [ ] 进度条正常显示 0-100%
- [ ] 生成完成后自动播放5秒
- [ ] 点击 Live 标识可切换播放状态
- [ ] 保存微动态到相册成功
- [ ] 相册权限被拒绝时正确引导
- [ ] 生成超时时显示错误提示
- [ ] 页面卸载时清理定时器

## 相关文件

### 小程序端
- `miniprogram/utils/api.js` - API 接口定义
- `miniprogram/pages/puzzle/result/result.js` - 时空拼图结果页
- `miniprogram/pages/puzzle/result/result.wxml` - 时空拼图结果页模板
- `miniprogram/pages/puzzle/result/result.wxss` - 时空拼图结果页样式
- `miniprogram/pages/transform/result/result.js` - 富贵变身结果页
- `miniprogram/pages/transform/result/result.wxml` - 富贵变身结果页模板
- `miniprogram/pages/transform/result/result.wxss` - 富贵变身结果页样式

### 后端
- `backend/routes/videoRoutes.js` - 视频生成路由
- `backend/services/videoService.js` - 视频生成服务
- `backend/services/pythonBridge.js` - Python 桥接服务

## 更新日志

### v1.0.0 (2026-01-08)
- ✅ 初始版本发布
- ✅ 支持生成5秒微动态视频
- ✅ 支持 Live Photo 格式转换
- ✅ 支持保存到相册
- ✅ 完整的权限控制和错误处理
