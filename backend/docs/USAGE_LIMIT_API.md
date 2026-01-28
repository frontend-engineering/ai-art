# Usage Limit System API Documentation

本文档描述使用次数限制系统的所有API端点。

## 目录

- [使用次数API](#使用次数api)
- [邀请API](#邀请api)
- [错误码](#错误码)

---

## 使用次数API

### 1. 检查使用次数

检查用户当前的使用次数和状态。

**端点:** `GET /api/usage/check/:userId`

**参数:**
- `userId` (路径参数) - 用户ID

**响应:**
```json
{
  "usage_count": 3,
  "usage_limit": 3,
  "can_generate": true,
  "user_type": "free"
}
```

**字段说明:**
- `usage_count` - 当前剩余使用次数
- `usage_limit` - 总使用次数上限（暂不使用）
- `can_generate` - 是否可以生成（usage_count > 0）
- `user_type` - 用户类型：`"free"` 或 `"paid"`

**示例:**
```bash
curl http://localhost:3000/api/usage/check/user-123
```

---

### 2. 扣减使用次数

在生成照片时扣减用户的使用次数。

**端点:** `POST /api/usage/decrement`

**请求体:**
```json
{
  "userId": "user-123",
  "generationId": "gen-456"
}
```

**参数说明:**
- `userId` - 用户ID（必需）
- `generationId` - 生成记录ID（必需）

**成功响应:**
```json
{
  "success": true,
  "remaining_count": 2,
  "message": "使用次数扣减成功"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "INSUFFICIENT_USAGE",
  "message": "使用次数不足",
  "remaining_count": 0
}
```

**示例:**
```bash
curl -X POST http://localhost:3000/api/usage/decrement \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","generationId":"gen-456"}'
```

---

### 3. 恢复使用次数

在生成失败时恢复已扣减的使用次数。

**端点:** `POST /api/usage/restore`

**请求体:**
```json
{
  "userId": "user-123",
  "generationId": "gen-456"
}
```

**参数说明:**
- `userId` - 用户ID（必需）
- `generationId` - 生成记录ID（必需）

**成功响应:**
```json
{
  "success": true,
  "remaining_count": 3,
  "message": "使用次数恢复成功"
}
```

**示例:**
```bash
curl -X POST http://localhost:3000/api/usage/restore \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","generationId":"gen-456"}'
```

---

### 4. 查询使用历史

查询用户的使用次数变更历史。

**端点:** `GET /api/usage/history/:userId`

**参数:**
- `userId` (路径参数) - 用户ID
- `page` (查询参数) - 页码，默认1
- `pageSize` (查询参数) - 每页数量，默认20

**响应:**
```json
{
  "logs": [
    {
      "id": "log-123",
      "action_type": "decrement",
      "amount": -1,
      "remaining_count": 2,
      "reason": "generation",
      "reference_id": "gen-456",
      "created_at": "2026-01-27T10:30:00Z"
    },
    {
      "id": "log-124",
      "action_type": "increment",
      "amount": 1,
      "remaining_count": 3,
      "reason": "invite_reward",
      "reference_id": "invite-789",
      "created_at": "2026-01-26T15:20:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

**字段说明:**
- `action_type` - 操作类型：`"decrement"`, `"increment"`, `"restore"`
- `amount` - 变更数量（负数表示减少）
- `remaining_count` - 操作后剩余次数
- `reason` - 原因：`"generation"`, `"payment"`, `"invite_reward"`, `"restore"`
- `reference_id` - 关联ID（生成ID、订单ID或邀请记录ID）

**示例:**
```bash
curl "http://localhost:3000/api/usage/history/user-123?page=1&pageSize=10"
```

---

## 邀请API

### 1. 获取邀请码

获取用户的邀请码。

**端点:** `GET /api/invite/code/:userId`

**参数:**
- `userId` (路径参数) - 用户ID

**响应:**
```json
{
  "invite_code": "A3B7K9M2",
  "qr_code_url": null
}
```

**示例:**
```bash
curl http://localhost:3000/api/invite/code/user-123
```

---

### 2. 验证邀请码

验证邀请码是否有效。

**端点:** `GET /api/invite/validate/:inviteCode`

**参数:**
- `inviteCode` (路径参数) - 邀请码

**成功响应:**
```json
{
  "valid": true,
  "inviter_id": "user-123",
  "inviter_nickname": "张三"
}
```

**失败响应:**
```json
{
  "valid": false,
  "error": "INVALID_INVITE_CODE",
  "message": "邀请码无效"
}
```

**示例:**
```bash
curl http://localhost:3000/api/invite/validate/A3B7K9M2
```

---

### 3. 处理邀请注册

处理新用户使用邀请码注册。

**端点:** `POST /api/invite/register`

**请求体:**
```json
{
  "invite_code": "A3B7K9M2",
  "new_user_id": "user-456",
  "openid": "wx-openid-789"
}
```

**参数说明:**
- `invite_code` - 邀请码（必需）
- `new_user_id` - 新用户ID（必需）
- `openid` - 微信openid（必需）

**成功响应:**
```json
{
  "success": true,
  "inviter_id": "user-123",
  "reward_granted": true,
  "message": "邀请注册成功，邀请人获得1次使用机会"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "INVALID_INVITE_CODE",
  "message": "邀请码无效"
}
```

**可能的错误码:**
- `INVALID_INVITE_CODE` - 邀请码无效
- `SELF_INVITE_NOT_ALLOWED` - 不能使用自己的邀请码
- `DUPLICATE_INVITE` - 该用户已被邀请过
- `USER_ALREADY_EXISTS` - 用户已存在，不能使用邀请码

**示例:**
```bash
curl -X POST http://localhost:3000/api/invite/register \
  -H "Content-Type: application/json" \
  -d '{
    "invite_code":"A3B7K9M2",
    "new_user_id":"user-456",
    "openid":"wx-openid-789"
  }'
```

---

### 4. 获取邀请统计

获取用户的邀请统计信息。

**端点:** `GET /api/invite/stats/:userId`

**参数:**
- `userId` (路径参数) - 用户ID

**响应:**
```json
{
  "total_invites": 10,
  "successful_invites": 8,
  "total_rewards": 8
}
```

**字段说明:**
- `total_invites` - 总邀请数（包括未成功的）
- `successful_invites` - 成功邀请数
- `total_rewards` - 总获得奖励次数

**示例:**
```bash
curl http://localhost:3000/api/invite/stats/user-123
```

---

### 5. 获取邀请记录

获取用户的邀请记录列表。

**端点:** `GET /api/invite/records/:userId`

**参数:**
- `userId` (路径参数) - 用户ID
- `page` (查询参数) - 页码，默认1
- `pageSize` (查询参数) - 每页数量，默认20

**响应:**
```json
{
  "records": [
    {
      "id": "invite-123",
      "invitee_id": "user-456",
      "invitee_nickname": "李四",
      "created_at": "2026-01-27T10:30:00Z",
      "reward_granted": true
    },
    {
      "id": "invite-124",
      "invitee_id": "user-789",
      "invitee_nickname": "王五",
      "created_at": "2026-01-26T15:20:00Z",
      "reward_granted": true
    }
  ],
  "total": 8,
  "page": 1,
  "pageSize": 20
}
```

**示例:**
```bash
curl "http://localhost:3000/api/invite/records/user-123?page=1&pageSize=10"
```

---

## 错误码

### 使用次数相关错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `INSUFFICIENT_USAGE` | 403 | 使用次数不足 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `INVALID_GENERATION_ID` | 400 | 无效的生成记录ID |
| `CONCURRENT_CONFLICT` | 409 | 并发冲突，请重试 |

### 邀请相关错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `INVALID_INVITE_CODE` | 400 | 邀请码无效 |
| `SELF_INVITE_NOT_ALLOWED` | 400 | 不能使用自己的邀请码 |
| `DUPLICATE_INVITE` | 400 | 该用户已被邀请过 |
| `USER_ALREADY_EXISTS` | 400 | 用户已存在，不能使用邀请码 |

### 通用错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `INVALID_REQUEST` | 400 | 请求参数无效 |
| `TRANSACTION_FAILED` | 500 | 数据库事务失败 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 |

---

## 使用流程示例

### 新用户注册流程

1. 新用户打开小程序，携带邀请码参数
2. 调用 `POST /api/invite/register` 处理邀请注册
3. 系统创建用户记录，初始化 `usage_count=3`
4. 系统为邀请人增加1次使用机会
5. 返回注册成功

### 生成照片流程

1. 用户点击生成按钮
2. 调用 `GET /api/usage/check/:userId` 检查使用次数
3. 如果 `can_generate=true`，调用 `POST /api/usage/decrement` 扣减次数
4. 开始生成照片
5. 如果生成失败，调用 `POST /api/usage/restore` 恢复次数

### 付费升级流程

1. 用户选择套餐并完成支付
2. 微信支付回调触发
3. 系统验证支付成功
4. 根据套餐类型增加使用次数（Basic: +5, Premium: +20）
5. 更新 `has_ever_paid=true`
6. 返回支付成功

---

## 注意事项

1. **并发控制**: 所有使用次数变更操作使用数据库行级锁（SELECT ... FOR UPDATE）确保原子性
2. **事务保证**: 所有涉及多表操作的接口使用数据库事务确保数据一致性
3. **日志记录**: 所有使用次数变更都会在 `usage_logs` 表中记录
4. **错误处理**: 所有错误都会记录到错误日志系统
5. **性能优化**: 关键查询字段已添加索引，单次查询响应时间 < 50ms

---

## 测试建议

### 单元测试
- 测试所有API端点的正常流程
- 测试边界情况（usage_count=0, 1, 2）
- 测试错误情况（无效参数、权限等）

### 属性测试
- 使用 fast-check 库进行属性测试
- 每个属性测试最少运行100次迭代
- 验证并发场景下的数据一致性

### 集成测试
- 测试完整的用户流程
- 测试邀请流程
- 测试付费流程
- 测试并发场景

---

## 更新日志

- **2026-01-27**: 初始版本，包含所有使用次数和邀请相关API
