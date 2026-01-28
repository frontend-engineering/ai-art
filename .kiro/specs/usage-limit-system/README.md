# 使用次数限制系统 - 完整文档

## 概述

使用次数限制系统为AI全家福小程序提供完整的使用次数管理功能，包括免费用户限制、付费用户管理、邀请奖励系统等。

**核心功能**:
- 免费用户：3次免费生成机会
- 付费用户：体验版+5次，尊享版+20次
- 邀请系统：邀请好友获得额外次数
- 智能提醒：在合适时机显示弹窗提醒

---

## 快速开始

### 1. 数据库初始化

```bash
# 启动 Docker 服务
docker-compose up -d

# 运行数据库迁移
cd backend
pnpm run migrate

# 初始化使用次数系统（为现有用户添加数据）
pnpm run usage:init
```

### 2. 验证安装

```bash
# 验证数据库索引
pnpm run usage:verify-indexes

# 运行测试
pnpm test
```

### 3. 测试用户

系统会自动创建测试用户：
- **用户ID**: `test-user-001`
- **免费次数**: 3次
- **邀请码**: 自动生成

---

## 系统架构

### 数据库表结构

#### users 表
```sql
- user_id (主键)
- openid (微信openid)
- usage_count (剩余使用次数)
- invite_code (邀请码，8位字母数字)
- invited_by (邀请人user_id)
- payment_status (付费状态: free/basic/premium)
- created_at, updated_at
```

#### invite_records 表
```sql
- id (主键)
- inviter_id (邀请人)
- invitee_id (被邀请人)
- reward_granted (是否已发放奖励)
- created_at
```

#### usage_logs 表
```sql
- id (主键)
- user_id
- action (操作类型: decrement/restore/grant)
- generation_id (生成记录ID)
- amount (变化数量)
- remaining_count (剩余次数)
- created_at
```

### API 端点

#### 查询使用次数
```
GET /api/usage/check/:userId
Response: { usageCount, userType, canGenerate }
```

#### 扣减使用次数
```
POST /api/usage/decrement
Body: { userId, generationId }
Response: { success, remainingCount }
```

#### 恢复使用次数
```
POST /api/usage/restore
Body: { userId, generationId }
Response: { success, remainingCount }
```

#### 邀请相关
```
GET /api/invite/code/:userId - 获取邀请码
POST /api/invite/accept - 接受邀请
GET /api/invite/stats/:userId - 邀请统计
```

---

## 前端集成

### 使用次数显示

在 launch 页面顶部显示剩余次数：

```xml
<usage-display 
  usageCount="{{usageCount}}"
  userType="{{userType}}"
/>
```

### 弹窗系统

系统会在以下时机自动显示弹窗：

1. **免费提醒弹窗** - 剩余次数 ≤ 2
2. **次数用尽弹窗** - 剩余次数 = 0（阻断式）
3. **付费续费弹窗** - 付费用户次数用尽

```xml
<usage-modal 
  visible="{{showUsageModal}}"
  modalType="{{usageModalType}}"
  usageCount="{{usageCount}}"
  bind:close="onUsageModalClose"
  bind:share="onUsageModalShare"
  bind:payment="onUsageModalPayment"
/>
```

### 使用次数扣减

**重要**: 使用次数在用户成功保存图片到本地相册时扣减，而不是生成完成时。

```javascript
// 在 result 页面的 doSaveImage() 方法中
await wx.saveImageToPhotosAlbum({
  filePath: downloadRes.tempFilePath,
  success: async () => {
    // 保存成功后扣减
    const app = getApp();
    await app.decrementUsageCount(generationId);
  }
});
```

---

## 用户流程

### 完整流程

1. **Launch页面** → 显示剩余次数，可能显示提醒弹窗
2. **Upload页面** → 上传照片
3. **Generating页面** → 生成图片（不扣减次数）
4. **Result页面** → 查看结果，可能显示提醒弹窗
5. **保存操作** → 点击"保存至相册"
6. **保存成功** → 扣减使用次数
7. **返回首页** → 点击"返回首页"按钮

### 弹窗决策逻辑

```javascript
// 免费用户
if (usageCount <= 2 && usageCount > 0) {
  showModal('free_reminder'); // launch + result 页面
}
if (usageCount === 0) {
  showModal('free_exhausted'); // launch 页面，阻断式
}

// 体验版用户
if (paymentStatus === 'basic' && usageCount === 0) {
  showModal('paid_renewal_basic'); // 显示续费/升级选项
}

// 尊享版用户
if (paymentStatus === 'premium' && usageCount === 0) {
  showModal('paid_renewal_premium'); // 显示续费选项
}
```

---

## 测试

### 运行测试

```bash
cd backend
pnpm test
```

### 测试覆盖

- ✅ 39个单元测试 (usageService)
- ✅ 12个属性测试 (usageService)
- ✅ 45个测试 (inviteService)
- ✅ 29个集成测试 (routes)
- ✅ 17个测试 (userService)

**总计**: 142个测试全部通过

### 测试场景

1. **并发扣减** - 使用事务和行锁防止重复扣减
2. **邀请奖励** - 验证邀请码生成和奖励发放
3. **边界条件** - 次数为0、负数等异常情况
4. **API集成** - 完整的请求-响应流程

---

## 最近更新 (2026-01-27)

### 1. 使用次数扣减时机调整

**变更**: 从生成完成时扣减 → 改为保存成功时扣减

**原因**: 用户应该只在成功保存图片时才被扣费

**修改文件**:
- `miniprogram/pages/puzzle/generating/generating.js` - 移除扣减
- `miniprogram/pages/transform/result/result.js` - 添加扣减
- `miniprogram/pages/puzzle/result/result.js` - 添加扣减
- `miniprogram/app.js` - 修复 paymentStatus 缺失问题

### 2. 返回首页按钮

**功能**: 在结果页面添加"返回首页"按钮

**修改文件**:
- `miniprogram/pages/transform/result/result.wxml` - 添加按钮
- `miniprogram/pages/puzzle/result/result.wxml` - 添加按钮
- `miniprogram/pages/transform/result/result.wxss` - 添加样式
- `miniprogram/pages/puzzle/result/result.wxss` - 添加样式

---

## 故障排查

### 问题：使用次数没有更新

**检查清单**:
1. Docker 服务是否运行: `docker-compose ps`
2. 数据库迁移是否完成: `pnpm run migrate`
3. 用户是否已登录: 检查 `app.globalData.userId`
4. API 是否返回正确数据: 查看控制台日志

### 问题：弹窗没有显示

**检查清单**:
1. 组件是否注册: 检查页面的 `.json` 文件
2. `usageCount` 是否正确: 查看页面 data
3. `paymentStatus` 是否正确: 检查本地存储
4. 弹窗逻辑是否触发: 查看 `usageModal.js`

### 问题：扣减失败

**检查清单**:
1. `generationId` 是否传递: 检查 URL 参数
2. 后端 API 是否正常: 查看后端日志
3. 数据库连接是否正常: 检查 Docker 容器

---

## 性能优化

### 数据库索引

系统已创建以下索引以优化查询性能：

```sql
-- users 表
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_invite_code ON users(invite_code);
CREATE INDEX idx_users_invited_by ON users(invited_by);

-- invite_records 表
CREATE INDEX idx_invite_inviter ON invite_records(inviter_id);
CREATE INDEX idx_invite_invitee ON invite_records(invitee_id);

-- usage_logs 表
CREATE INDEX idx_usage_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_generation_id ON usage_logs(generation_id);
```

### 并发控制

使用数据库事务和行级锁防止并发问题：

```javascript
await db.query('BEGIN');
await db.query('SELECT * FROM users WHERE user_id = ? FOR UPDATE', [userId]);
// 执行扣减操作
await db.query('COMMIT');
```

---

## 部署检查清单

- [x] 数据库迁移已执行
- [x] 后端服务已部署
- [x] 前端组件已集成
- [x] 测试已通过
- [x] 文档已创建
- [x] 使用次数扣减时机已修正
- [x] 返回首页按钮已添加
- [ ] 生产环境变量已配置
- [ ] 监控和日志已验证

---

## 相关文档

- **后端文档**: `backend/README.md`
- **API文档**: `backend/docs/USAGE_LIMIT_API.md`
- **TODO列表**: `docs/TODO.md` (section 2.2)

---

**最后更新**: 2026-01-27  
**状态**: ✅ 完成并准备上线  
**维护者**: AI全家福开发团队
