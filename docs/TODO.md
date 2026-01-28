# AI全家福·团圆照相馆 - 待办事项

## 一、UI/UX 优化

### 1.1 导航栏优化 ✅ 部分完成
- [x] 调整顶部toolbar功能区域
- [x] 移除与小程序原生导航栏重复的功能（如返回按钮）
- [ ] 整体交互设计优化
- [ ] 统一各页面导航栏样式

**说明：** 已完成基础导航栏样式统一，需要进一步优化交互流程。

---

## 二、核心功能开发

### 2.1 小程序分享功能增强 🔴 高优先级

#### 需求描述
用户分享生成结果后，被分享者点击链接应该能看到分享者的作品预览，并提供两个操作选项。

#### 功能要点
1. **分享记录**
   - 记录分享者的用户ID
   - 记录生成结果的编号（generation_id）
   - 生成唯一的分享链接

2. **被分享者视图**
   - 显示分享者的照片预览
   - 显示分享者昵称/头像
   - 提供两个操作按钮：（🟢 后期实现）
     - **"帮TA支付升级费用"** - 跳转到支付页面，为分享者购买套餐
     - **"我也要设计！"** - 跳转到登录页面，开始自己的创作

3. **数据库设计**
   ```sql
   CREATE TABLE share_records (
     id VARCHAR(36) PRIMARY KEY,
     sharer_id VARCHAR(36) NOT NULL,
     generation_id VARCHAR(36) NOT NULL,
     share_code VARCHAR(20) UNIQUE,
     view_count INT DEFAULT 0,
     help_pay_count INT DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (sharer_id) REFERENCES users(id),
     FOREIGN KEY (generation_id) REFERENCES generation_history(id)
   );
   ```

4. **API接口**
   - `POST /api/share/create` - 创建分享记录
   - `GET /api/share/:shareCode` - 获取分享内容
   - `POST /api/share/help-pay` - 帮助支付

5. **页面实现**
   - 新增页面：`pages/share/preview/preview` - 被分享者预览页面
     - 显示分享者的生成照片
     - 显示分享者昵称/头像
     - 显示两个操作按钮（🟢 后期实现）
   - 更新现有功能：优化"分享家族群"按钮（`pages/transform/result/result`）
     - 生成带分享码的分享链接
     - 记录分享记录到数据库（sharer_id, generation_id, share_code）
     - 分享时跳转到新的预览页面

---

### 2.2 使用次数限制系统 🔴 高优先级

#### 需求描述（已更新）
实现完整的使用次数限制和邀请奖励机制。

#### 核心规则
1. **免费用户**
   - 初始：3次免费使用次数
   - 邀请新用户：每邀请1人获得1次
   - 新用户定义：以前从未打开过本小程序

2. **付费用户**
   - 体验版（¥9.9）：使用次数增加5次
   - 尊享版（¥29.9）：使用次数增加20次

3. **次数消耗**
   - 每次生成消耗1次

#### 功能模块

**A. 数据库扩展**（详见 `docs/USAGE_LIMIT_DESIGN.md`）
- 扩展 users 表：添加 usage_count, usage_limit, invite_code 等字段
- 新增 invite_records 表：邀请关系记录
- 新增 invite_stats 表：邀请统计
- 新增 usage_logs 表：使用记录日志

**B. 后端API**
- [x] 用户初始化接口
- [ ] 使用次数检查接口
- [ ] 使用次数扣减接口
- [ ] 邀请码生成接口
- [ ] 邀请关系处理接口
- [ ] 邀请统计接口
- [ ] 付费升级接口

**C. 前端组件**
- [ ] 免费次数提醒弹窗
- [ ] 次数用尽警告弹窗
- [ ] 付费用户续费弹窗
- [ ] 邀请页面
- [ ] 套餐选择页面优化

#### 弹窗逻辑设计

**策略说明：**
- **免费用户**（从未付费）：遵循免费次数规则，引导邀请和付费
- **付费用户**（已购买过任何套餐）：一付永逸策略，引导续费或升级

---

**1. 免费用户弹窗逻辑**

```
剩余次数 > 2：
  - launch页面：不弹窗
  - result页面：不弹窗

剩余次数 ≤ 2：
  - launch页面：显示提醒弹窗
  - result页面：显示提醒弹窗

剩余次数 = 0：
  - launch页面：显示警告弹窗（阻断式）
  - 按钮变灰，点击弹出警告
```

**免费次数提醒弹窗**（剩余 ≤ 2次）
```
标题：温馨提示
内容：您的免费次数仅剩 X 次

付费套餐优势：
  ✓ 无水印 - 高清原图下载
  ✓ 无广告 - 纯净使用体验
  ✓ 更多次数 - 体验版+5次，尊享版+20次
  ✓ 高清画质 - 体验版2K，尊享版4K

按钮：
  - [查看套餐] - 跳转到套餐选择页面
  - [邀请好友获取次数] - 跳转到邀请页面
  - [知道了] - 关闭弹窗
```

**次数用尽警告弹窗**（剩余 = 0次）
```
标题：免费次数已用尽
内容：您的免费次数已经用尽，请选择是否继续体验
按钮：
  - [选择套餐] - 跳转到套餐选择页面
  - [邀请好友获取次数] - 跳转到邀请页面
  - [下次再说] - 关闭弹窗，返回launch页面
```

---

**2. 付费用户弹窗逻辑（一付永逸策略）**

**A. 体验版用户（累加5次）**

```
剩余次数 > 0：
  - 正常使用，不弹窗

剩余次数 = 0（用完后的下一次）：
  - launch页面：显示续费/升级弹窗
  - 按钮变灰，点击弹出弹窗
```

**体验版续费/升级弹窗**
```
标题：次数已用完
内容：您的使用次数已用完，继续享受服务
套餐选项：
  - [续费体验版] ¥9.9 - 再获得5次使用机会
  - [升级尊享版] ¥29.9 - 再获得20次使用机会
  - [暂不续费] - 关闭弹窗
```

**B. 尊享版用户（累加20次）**

```
剩余次数 > 0：
  - 正常使用，不弹窗

剩余次数 = 0（用完后的下一次）：
  - launch页面：显示续费弹窗
  - 按钮变灰，点击弹出弹窗
```

**尊享版续费弹窗**
```
标题：次数已用完
内容：您的使用次数已用完，继续享受服务
套餐选项：
  - [续费尊享版] ¥29.9 - 再获得20次使用机会
  - [暂不续费] - 关闭弹窗
```

---

**3. 按钮状态控制**

```javascript
// launch页面的"立即制作"按钮状态
function getButtonState(user) {
  const { remainingCount, paymentStatus, hasEverPaid } = user;
  
  // 免费用户
  if (!hasEverPaid) {
    if (remainingCount === 0) {
      return {
        disabled: true,
        className: 'disabled',
        onClick: () => showFreeUserWarningModal()
      };
    }
    return { disabled: false };
  }
  
  // 付费用户
  if (paymentStatus === 'premium') {
    // 尊享版：每次购买增加20次
    if (remainingCount === 0) {
      return {
        disabled: true,
        className: 'disabled',
        onClick: () => showPaidUserRenewalModal('premium')
      };
    }
    return { disabled: false };
  }
  
  if (paymentStatus === 'basic') {
    // 体验版：每次购买增加5次
    if (remainingCount === 0) {
      return {
        disabled: true,
        className: 'disabled',
        onClick: () => showPaidUserRenewalModal('basic')
      };
    }
    return { disabled: false };
  }
}
```

---

**4. 数据库字段支持**

需要在users表中添加字段：
```sql
ALTER TABLE users 
ADD COLUMN has_ever_paid BOOLEAN DEFAULT FALSE COMMENT '是否曾经付费（一付永逸标记）',
ADD COLUMN first_payment_at TIMESTAMP NULL COMMENT '首次付费时间',
ADD COLUMN last_payment_at TIMESTAMP NULL COMMENT '最后付费时间';
```

当用户完成任何付费订单后：
```javascript
// 更新用户付费状态
await db.query(`
  UPDATE users 
  SET has_ever_paid = TRUE,
      first_payment_at = COALESCE(first_payment_at, NOW()),
      last_payment_at = NOW()
  WHERE id = ?
`, [userId]);
```

#### 实现优先级
- **P0**（本周完成）
  - [x] 数据库表结构设计
  - [ ] 数据库迁移脚本
  - [ ] 用户初始化逻辑
  - [ ] 使用次数检查与扣减
  - [ ] 弹窗组件开发

- **P1**（下周完成）
  - [ ] 邀请功能完整实现
  - [ ] 弹窗逻辑实现
  - [ ] 付费升级功能
  - [ ] 按钮状态控制

- **P2**（后续优化）
  - [ ] 邀请页面美化
  - [ ] 数据统计分析
  - [ ] 运营活动支持

---

### 2.3 水印功能 🟡 中优先级

#### 需求描述
根据用户付费状态添加或移除水印。

#### 功能规则
- **免费版**：必须添加水印
- **体验版**：无水印
- **尊享版**：无水印

#### 实现方案

**A. 后端水印处理**
```python
# backend/utils/add_watermark.py
def add_watermark(image_path, user_payment_status):
    if user_payment_status == 'free':
        # 添加水印逻辑
        watermark_text = "AI全家福 · 团圆照相馆"
        position = "bottom-right"
        opacity = 0.6
        # 使用PIL添加水印
        return watermarked_image_path
    else:
        # 付费用户不添加水印
        return image_path
```

**B. 水印样式设计**
- 位置：右下角
- 文字：AI全家福 · 团圆照相馆
- 字体：微软雅黑
- 颜色：白色，透明度60%
- 大小：根据图片尺寸自适应

**C. API调整**
- 生成图片时检查用户付费状态
- 根据状态决定是否添加水印
- 返回带水印或无水印的图片URL

#### 实现步骤
1. [ ] 安装PIL/Pillow库
2. [ ] 实现水印添加函数
3. [ ] 集成到图片生成流程
4. [ ] 测试不同付费状态的水印效果

---

### 2.4 小程序广告功能 🟢 低优先级

#### 需求描述
免费版显示广告，付费版无广告。
需要用微信小程序广告接口自动加载广告。

#### 功能规则
- **免费版**：显示广告
- **体验版**：无广告
- **尊享版**：无广告

#### 广告位置
1. 启动页底部
2. 结果页底部
3. 历史记录页底部

#### 实现方案
- 使用微信小程序广告组件
- 根据用户付费状态动态显示/隐藏
- 广告收益统计

#### 实现步骤
1. [ ] 申请微信广告位
2. [ ] 集成广告组件
3. [ ] 实现条件显示逻辑
4. [ ] 测试广告展示效果

---

### 2.5 画质分级 🟡 中优先级

#### 需求描述
根据付费状态提供不同画质的图片。

#### 功能规则
- **免费版**：标清（1080p）
- **体验版**：2K画质（2560x1440）
- **尊享版**：4K画质（3840x2160）

#### 实现方案

**A. 后端生成参数调整**
```javascript
const QUALITY_SETTINGS = {
  free: { width: 1920, height: 1080, quality: 80 },
  basic: { width: 2560, height: 1440, quality: 90 },
  premium: { width: 3840, height: 2160, quality: 95 }
};

function getQualitySettings(paymentStatus) {
  return QUALITY_SETTINGS[paymentStatus] || QUALITY_SETTINGS.free;
}
```

**B. API调整**
- 生成图片时根据用户付费状态选择画质参数
- 火山引擎API调用时传入对应的分辨率参数

**C. 存储优化**
- 不同画质的图片分别存储
- OSS存储成本评估
- 考虑按需生成高清版本

#### 实现步骤
1. [ ] 调研火山引擎API画质参数
2. [ ] 实现画质分级逻辑
3. [ ] 测试不同画质生成效果
4. [ ] 优化存储策略

---

## 三、页面开发清单

### 3.1 新增页面
- [ ] `pages/share/preview/preview` - 分享预览页
- [ ] `pages/invite/index/index` - 邀请页面
- [ ] `pages/usage/stats/stats` - 使用统计页面（可选）

### 3.2 页面优化
- [ ] `pages/launch/launch` - 添加次数显示和弹窗逻辑
- [ ] `pages/transform/launch/launch` - 同上
- [ ] `pages/puzzle/launch/launch` - 同上
- [ ] `pages/transform/result/result` - 添加分享按钮和次数提醒
- [ ] `pages/puzzle/result/result` - 同上

### 3.3 组件开发
- [ ] `components/usage-warning-modal` - 次数警告弹窗
- [ ] `components/package-selector` - 套餐选择组件（优化）
- [ ] `components/share-modal` - 分享弹窗
- [ ] `components/ad-banner` - 广告横幅组件

---

## 四、数据库迁移

### 4.1 待执行的迁移脚本
- [ ] `004_add_usage_limit.sql` - 使用次数限制功能
- [ ] `005_add_share_records.sql` - 分享记录功能
- [ ] `006_add_watermark_settings.sql` - 水印配置（可选）

### 4.2 数据迁移注意事项
1. 备份现有数据
2. 在测试环境先执行
3. 为现有用户初始化默认值
4. 验证数据完整性

---

## 五、测试计划

### 5.1 功能测试
- [ ] 使用次数扣减测试
- [ ] 邀请奖励发放测试
- [ ] 每日邀请限制测试
- [ ] 付费升级测试
- [ ] 水印添加测试
- [ ] 画质分级测试
- [ ] 分享功能测试

### 5.2 边界测试
- [ ] 并发扣减次数
- [ ] 重复邀请处理
- [ ] 跨日邀请重置
- [ ] 支付失败回滚
- [ ] 次数为0时的各种操作

### 5.3 性能测试
- [ ] 高并发下的次数扣减
- [ ] 大量邀请记录查询
- [ ] 图片生成性能（不同画质）

---

## 六、部署计划

### 6.1 开发环境
- [ ] 配置测试数据库
- [ ] 部署测试环境
- [ ] 功能联调测试

### 6.2 生产环境
- [ ] 数据库备份
- [ ] 执行迁移脚本
- [ ] 灰度发布
- [ ] 全量发布
- [ ] 监控告警

---

## 七、文档更新

### 7.1 技术文档
- [x] `docs/USAGE_LIMIT_DESIGN.md` - 使用次数限制系统设计
- [ ] `docs/SHARE_FEATURE_DESIGN.md` - 分享功能设计
- [ ] `docs/WATERMARK_DESIGN.md` - 水印功能设计
- [ ] `docs/API_DOCUMENTATION.md` - API接口文档更新

### 7.2 用户文档
- [ ] 使用说明更新
- [ ] 付费套餐说明
- [ ] 邀请规则说明
- [ ] 常见问题FAQ

---

## 八、运营准备

### 8.1 运营素材
- [ ] 邀请海报设计
- [ ] 套餐介绍图
- [ ] 功能说明图
- [ ] 分享卡片设计

### 8.2 运营活动
- [ ] 新用户注册奖励
- [ ] 邀请排行榜
- [ ] 限时优惠活动
- [ ] 节日特别活动

---

## 九、优先级总结

### 🔴 本周必须完成（P0）
1. 使用次数限制系统 - 数据库和基础API
2. 次数显示组件
3. 基础弹窗逻辑

### 🟡 下周完成（P1）
1. 邀请功能完整实现
2. 分享功能开发
3. 水印功能实现
4. 付费升级功能

### 🟢 后续优化（P2）
1. 画质分级
2. 广告功能
3. 数据统计分析
4. 运营活动支持

---

**最后更新：** 2026-01-26  
**负责人：** 开发团队  
**预计完成时间：** 2周内完成P0和P1功能