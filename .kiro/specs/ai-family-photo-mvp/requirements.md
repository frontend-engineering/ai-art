# Requirements Document

## Introduction

AI全家福·团圆照相馆是一个基于火山引擎AI的艺术照生成平台,旨在解决中国家庭"人聚不齐"和"背景太土"的痛点。本文档定义了MVP(最小可行产品)阶段的核心功能需求,目标是在2026年1月20日前上线,实现快速变现。

## Glossary

- **System**: AI全家福·团圆照相馆系统
- **User**: 使用系统生成艺术照的终端用户
- **Art_Photo**: 由AI生成的艺术照片
- **Template**: 艺术风格参考图,用于指导AI生成特定风格的照片
- **Task**: 火山引擎API的异步生成任务
- **OSS**: 对象存储服务(腾讯云COS),用于存储图片
- **Free_User**: 免费用户,生成的照片带水印且功能受限
- **Paid_User**: 付费用户,可获得无水印高清照片和完整功能
- **Regenerate_Count**: 重生成次数,用户可重新生成艺术照的剩余次数

## Requirements

### Requirement 1: 4选1生成策略

**User Story:** 作为用户,我希望系统一次生成4张不同效果的艺术照供我选择,这样我可以挑选最满意的一张,避免AI生成效果不理想的风险。

#### Acceptance Criteria

1. WHEN 用户点击"生成艺术照"按钮 THEN THE System SHALL 调用火山引擎API生成4张不同seed值的艺术照
2. WHEN 4张艺术照生成完成 THEN THE System SHALL 以4宫格形式展示所有结果
3. WHEN 用户点击4宫格中的任意一张照片 THEN THE System SHALL 将该照片标记为选中状态并高亮显示
4. WHEN 用户选中一张照片后 THEN THE System SHALL 允许用户对选中的照片进行后续操作(保存/重生成)
5. THE System SHALL 限制免费用户只能生成1张照片(不启用4选1),付费用户才能使用4选1功能

### Requirement 2: 支付系统集成

**User Story:** 作为用户,我希望能够通过微信支付购买高清无水印照片,这样我可以保存和分享满意的艺术照。

#### Acceptance Criteria

1. WHEN 用户点击"保存图片"按钮 THEN THE System SHALL 弹出支付选项弹窗,展示不同的付费套餐
2. THE System SHALL 提供三种付费套餐: 9.9元尝鲜包、29.9元尊享包、免费版(带水印)
3. WHEN 用户选择付费套餐并完成支付 THEN THE System SHALL 调用微信支付API完成支付流程
4. WHEN 支付成功 THEN THE System SHALL 更新用户的付费状态并解锁对应功能
5. WHEN 支付失败 THEN THE System SHALL 提示用户支付失败原因并允许重试

### Requirement 3: 水印功能

**User Story:** 作为产品运营者,我希望免费版生成的照片带有明显水印,这样可以引导用户付费购买无水印版本,实现商业变现。

#### Acceptance Criteria

1. WHEN 免费用户生成艺术照 THEN THE System SHALL 在照片上添加"AI全家福制作"水印
2. THE System SHALL 将水印放置在照片中心位置,大小占照片面积的15%-20%
3. WHEN 用户完成付费 THEN THE System SHALL 提供无水印的高清原图下载
4. THE System SHALL 在水印中包含二维码或文字引导,提示用户扫码付费去除水印
5. WHEN 用户下载免费版照片 THEN THE System SHALL 确保水印无法被轻易去除

### Requirement 4: 微动态生成

**User Story:** 作为用户,我希望能够将静态艺术照转换为微动态视频(Live Photo),这样我可以在朋友圈分享更有趣的内容。

#### Acceptance Criteria

1. WHEN 用户选择"生成微动态"选项 THEN THE System SHALL 调用火山引擎微动态API生成5秒短视频
2. THE System SHALL 确保人物仅轻微微动(眼部/嘴角),背景元素(烟花/灯笼/雪花)有明显动态效果
3. WHEN 微动态生成完成 THEN THE System SHALL 同时提供MP4格式和Live Photo格式下载
4. THE System SHALL 限制微动态功能仅对29.9元尊享包用户开放
5. WHEN 微动态生成失败 THEN THE System SHALL 提示用户失败原因并允许重试

### Requirement 5: 用户鉴权与会话管理

**User Story:** 作为系统管理员,我希望系统能够识别和管理不同用户,这样可以追踪用户的使用情况和付费状态。

#### Acceptance Criteria

1. WHEN 用户首次访问系统 THEN THE System SHALL 为用户生成唯一的用户ID并存储在浏览器
2. THE System SHALL 使用用户ID追踪用户的生成历史、付费状态和重生成次数
3. WHEN 用户清除浏览器数据 THEN THE System SHALL 将用户视为新用户并重新分配用户ID
4. THE System SHALL 在后端数据库中持久化用户数据,避免数据丢失
5. WHEN 用户付费后 THEN THE System SHALL 更新用户的付费状态并在所有设备上同步

### Requirement 6: 数据持久化

**User Story:** 作为用户,我希望我的生成历史和付费记录能够永久保存,这样我可以随时查看和下载之前生成的照片。

#### Acceptance Criteria

1. THE System SHALL 使用MySQL数据库存储用户数据、生成历史和付费记录
2. WHEN 用户生成艺术照 THEN THE System SHALL 将任务ID、原始图片URL、生成结果URL保存到数据库
3. WHEN 用户完成支付 THEN THE System SHALL 将支付记录(订单ID、金额、时间)保存到数据库
4. THE System SHALL 定期清理超过30天的未付费生成记录,节省存储空间
5. WHEN 用户查询历史记录 THEN THE System SHALL 从数据库中读取并展示最近10条记录

### Requirement 7: Python工具层集成

**User Story:** 作为开发者,我希望系统能够在调用AI API前对图片进行预处理,这样可以提高生成成功率和效果质量。

#### Acceptance Criteria

1. WHEN 用户上传图片 THEN THE System SHALL 调用Python脚本进行图片压缩,将图片大小控制在2MB以内
2. THE System SHALL 调用Python脚本进行人脸检测,确保图片中至少包含一张清晰的人脸
3. WHEN 人脸检测失败 THEN THE System SHALL 提示用户重新上传清晰的正面照
4. THE System SHALL 使用OpenCV进行人脸检测,最小人脸尺寸为80x80像素,置信度阈值为0.7
5. THE System SHALL 通过Node.js的child_process调用Python脚本,并通过JSON格式传递参数和结果

### Requirement 8: 实体产品对接 (MVP简化版)

**User Story:** 作为用户,我希望能够将生成的艺术照制作成实体产品(晶瓷画/卷轴),这样我可以将照片挂在家中展示。

#### Acceptance Criteria

1. WHEN 用户生成艺术照后 THEN THE System SHALL 在结果页展示实体产品推荐(晶瓷画/卷轴)
2. THE System SHALL 提供产品预览功能,展示照片在实体产品上的效果
3. WHEN 用户选择购买实体产品 THEN THE System SHALL 收集用户的收货信息和产品选择
4. THE System SHALL 将订单信息(艺术照URL、收货信息、产品类型)导出为Excel文件
5. THE System SHALL 允许管理员下载Excel订单文件,人工发送给工厂客服完成下单

**注意**: MVP阶段不对接淘宝/1688 API,采用人工处理订单的方式,避免API申请和调试的时间成本。

### Requirement 9: 画布定位功能

**User Story:** 作为用户,我希望能够在生成前手动调整每个人脸的位置和大小,这样可以避免AI自动合成时出现位置不合理的问题。

#### Acceptance Criteria

1. WHEN 用户上传多张人物照片 THEN THE System SHALL 自动检测每张照片中的人脸并提取
2. THE System SHALL 提供画布界面,展示选中的背景模板,允许用户拖拽放置人脸
3. WHEN 用户拖拽人脸到画布上 THEN THE System SHALL 支持调整人脸的位置、大小和旋转角度
4. THE System SHALL 提供网格线和对齐辅助功能,帮助用户精确定位人脸位置
5. WHEN 用户完成人脸定位 THEN THE System SHALL 将定位信息(坐标、尺寸、角度)传递给AI生成接口,使用Img2Img模式进行精细化生成

### Requirement 10: 性能优化

**User Story:** 作为用户,我希望系统响应速度快,生成时间短,这样我可以快速获得艺术照结果。

#### Acceptance Criteria

1. THE System SHALL 确保单张艺术照生成响应时间≤15秒
2. WHEN 并发100个用户同时生成 THEN THE System SHALL 保持成功率≥99%
3. THE System SHALL 使用Redis缓存常用模板和用户会话数据,减少数据库查询
4. THE System SHALL 使用CDN加速图片加载,确保图片加载时间≤2秒
5. WHEN 系统负载超过80% THEN THE System SHALL 自动触发弹性扩容

### Requirement 11: 错误处理与容错

**User Story:** 作为用户,我希望当系统出现错误时能够得到清晰的提示,这样我可以知道如何解决问题。

#### Acceptance Criteria

1. WHEN 火山引擎API调用失败 THEN THE System SHALL 自动重试1次,超时时间为30秒
2. WHEN 重试仍然失败 THEN THE System SHALL 向用户展示友好的错误提示并建议解决方案
3. THE System SHALL 记录所有API调用失败的日志,包括错误码、错误信息和时间戳
4. WHEN 图片上传失败 THEN THE System SHALL 提示用户检查网络连接并允许重新上传
5. THE System SHALL 在关键操作(支付/生成)前进行参数校验,避免无效请求
