# 微动态生成功能实现总结

## 实现概述

本文档记录了微动态生成功能的实现，包括视频生成API调用、Live Photo格式转换、权限控制和错误处理。

## 已实现功能

### 1. 视频生成API调用 (Task 11.1)

**实现位置**: `backend/server.js`

**核心函数**:
- `generateVideo()`: 调用火山引擎视频生成API
- `getVideoTaskStatus()`: 查询视频生成任务状态

**API端点**:
- `POST /api/generate-video`: 创建视频生成任务
- `GET /api/video-task-status/:taskId`: 查询视频任务状态

**关键参数**:
- `motion_bucket_id`: 10 (低动态幅度，人物仅轻微微动)
- `fps`: 10 (每秒10帧)
- `video_length`: 5 (5秒视频)
- `dynamic_type`: 'festival' (添加节日动态元素)
- `high_retention`: true (确保人物高保真)

### 2. Live Photo格式转换 (Task 11.2)

**实现位置**: 
- Python脚本: `backend/utils/convert_to_live_photo.py`
- Node.js集成: `backend/server.js`

**核心功能**:
- 使用FFmpeg将MP4转换为HEVC编码的MOV文件
- 支持URL和本地文件路径输入
- 自动下载远程视频文件
- 优化流式播放 (faststart)

**API端点**:
- `POST /api/convert-to-live-photo`: 转换视频为Live Photo格式

**FFmpeg参数**:
```bash
ffmpeg -i input.mp4 \
  -c:v hevc \
  -tag:v hvc1 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -y output.mov
```

### 3. 权限控制 (Task 11.3)

**实现方式**:
- 检查用户付费状态 (`payment_status`)
- 仅允许 `premium` (尊享包) 用户使用微动态功能
- 其他用户返回403错误，提示升级套餐

**权限检查代码**:
```javascript
if (user.payment_status !== 'premium') {
  return res.status(403).json({ 
    error: '权限不足', 
    message: '微动态功能仅对尊享包用户开放，请升级套餐' 
  });
}
```

### 4. 错误处理 (Task 11.4)

**实现的错误处理**:
- API调用失败自动返回错误信息
- 参数校验 (缺少必要参数返回400)
- 用户不存在返回404
- 权限不足返回403
- 服务器错误返回500
- 超时处理 (60秒超时)
- 友好的错误提示信息

## API使用示例

### 生成微动态视频

```bash
curl -X POST http://localhost:3001/api/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "userId": "user-uuid",
    "motionBucketId": 10,
    "fps": 10,
    "videoLength": 5,
    "dynamicType": "festival"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "task-id-123",
    "message": "视频生成任务已创建，请轮询查询任务状态"
  }
}
```

### 查询视频任务状态

```bash
curl http://localhost:3001/api/video-task-status/task-id-123
```

**响应 (处理中)**:
```json
{
  "success": true,
  "data": {
    "Result": {
      "data": {
        "status": "processing"
      }
    }
  }
}
```

**响应 (完成)**:
```json
{
  "success": true,
  "data": {
    "Result": {
      "data": {
        "status": "done",
        "video_url": "https://example.com/video.mp4",
        "uploaded_video_url": "https://example.com/video.mp4"
      }
    }
  }
}
```

### 转换Live Photo格式

```bash
curl -X POST http://localhost:3001/api/convert-to-live-photo \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "userId": "user-uuid"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "livePhotoUrl": "https://cdn.example.com/live-photo.mov",
    "fileSize": 1234567,
    "message": "Live Photo格式转换成功"
  }
}
```

## 技术要点

### 1. 火山引擎API集成
- 使用火山引擎视频生成API
- 支持自定义动态参数
- 异步任务处理模式

### 2. FFmpeg视频转换
- HEVC编码确保高压缩率
- hvc1标签确保iOS兼容性
- yuv420p像素格式确保广泛兼容

### 3. 权限控制
- 基于用户付费状态的权限控制
- 清晰的错误提示引导用户升级

### 4. 文件处理
- 自动下载远程视频文件
- 临时文件管理和清理
- 上传到OSS存储

## 依赖项

### Python依赖
- FFmpeg (系统级依赖)

### Node.js依赖
- 已有依赖即可，无需额外安装

## 测试建议

1. **功能测试**:
   - 测试视频生成API调用
   - 测试Live Photo格式转换
   - 测试权限控制逻辑
   - 测试错误处理

2. **集成测试**:
   - 完整流程测试 (生成视频 → 转换格式 → 上传OSS)
   - 权限控制测试 (不同付费状态用户)

3. **性能测试**:
   - 视频生成时间
   - 格式转换时间
   - 并发处理能力

## 注意事项

1. **FFmpeg依赖**: 确保服务器已安装FFmpeg
2. **超时设置**: 视频生成和转换都设置了60秒超时
3. **权限控制**: 仅尊享包用户可使用，需要在前端UI中明确提示
4. **文件清理**: 临时文件会自动清理，但建议定期检查临时目录

## 后续优化建议

1. **缓存机制**: 对已生成的视频进行缓存，避免重复生成
2. **批量处理**: 支持批量生成多个视频
3. **进度推送**: 使用WebSocket实时推送生成进度
4. **格式支持**: 支持更多视频格式输出
5. **质量选项**: 提供不同质量级别的视频生成选项

## 实现日期

2026-01-03
