# API重试逻辑实现文档

## 概述

本模块实现了API调用的自动重试机制，用于提高系统的稳定性和可靠性。当API调用失败时，系统会自动重试，减少因临时网络问题或服务器错误导致的失败。

## 功能特性

### 1. 自动重试
- **失败自动重试1次**: 当API调用失败时，系统会自动重试1次
- **超时时间30秒**: 每次API调用的超时时间为30秒
- **指数退避**: 重试间隔采用指数退避策略，避免对服务器造成过大压力

### 2. 智能重试
- **错误类型判断**: 只对可重试的错误进行重试（如网络错误、5xx服务器错误）
- **客户端错误不重试**: 4xx客户端错误（如参数错误、权限错误）不会重试
- **详细日志记录**: 记录每次重试的详细信息，便于问题排查

### 3. 灵活配置
- **可配置重试次数**: 支持自定义最大重试次数
- **可配置超时时间**: 支持自定义超时时间
- **重试回调**: 支持在重试前执行自定义回调函数

## 使用方法

### 基本用法

```javascript
const { executeWithRetry } = require('./utils/apiRetry');

// 包装API调用
const result = await executeWithRetry(
  () => someApiFunction(),
  {
    maxRetries: 1,           // 最大重试次数
    timeout: 30000,          // 超时时间（毫秒）
    operationName: 'API调用', // 操作名称（用于日志）
    onRetry: (attempt, error) => {
      console.log(`重试第 ${attempt} 次，错误: ${error.message}`);
    }
  }
);
```

### 包装函数

```javascript
const { withRetry } = require('./utils/apiRetry');

// 创建带重试能力的函数
const apiWithRetry = withRetry(originalApiFunction, {
  maxRetries: 1,
  timeout: 30000,
  operationName: '生成艺术照'
});

// 使用包装后的函数
const result = await apiWithRetry(param1, param2);
```

### 智能重试

```javascript
const { executeWithSmartRetry } = require('./utils/apiRetry');

// 只对可重试的错误进行重试
const result = await executeWithSmartRetry(
  () => someApiFunction(),
  {
    maxRetries: 1,
    timeout: 30000,
    operationName: 'API调用'
  }
);
```

## 已集成的API

以下API已集成重试逻辑：

### 1. 艺术照生成API
- **函数**: `generateArtPhoto()`
- **重试次数**: 1次
- **超时时间**: 30秒
- **位置**: `backend/server.js`

### 2. 任务状态查询API
- **函数**: `getTaskStatus()`
- **重试次数**: 1次
- **超时时间**: 30秒
- **位置**: `backend/server.js`

### 3. 视频生成API
- **函数**: `generateVideo()`
- **重试次数**: 1次
- **超时时间**: 30秒
- **位置**: `backend/server.js`

### 4. 视频任务状态查询API
- **函数**: `getVideoTaskStatus()`
- **重试次数**: 1次
- **超时时间**: 30秒
- **位置**: `backend/server.js`

### 5. 微信支付API
- **函数**: `wechatPayment.transactions_jsapi()`
- **重试次数**: 1次
- **超时时间**: 30秒
- **位置**: `backend/server.js` (两处：发起支付和重试支付)

## 错误类型判断

### 可重试的错误

以下错误类型会触发自动重试：

1. **网络错误**
   - `ECONNRESET`: 连接被重置
   - `ETIMEDOUT`: 连接超时
   - `ENOTFOUND`: 域名解析失败
   - `ECONNREFUSED`: 连接被拒绝

2. **服务器错误**
   - `5xx`: 服务器内部错误（500-599）

3. **限流错误**
   - `429`: Too Many Requests

4. **超时错误**
   - 包含"超时"关键字的错误

### 不可重试的错误

以下错误类型不会重试，直接抛出：

1. **客户端错误**
   - `4xx`: 客户端错误（400-499）
   - 例如：参数错误、权限不足、资源不存在等

2. **业务逻辑错误**
   - 应用层的业务逻辑错误

## 日志格式

重试过程会输出详细的日志信息：

```
[API重试] 生成艺术照 - 第 1 次尝试 (最多 2 次)
[API重试] 生成艺术照 - 第 1 次尝试失败: 网络连接超时
[API重试] 生成艺术照 - 准备重试 (剩余 1 次机会)
[API重试] 生成艺术照 - 等待 1000ms 后重试
[API重试] 生成艺术照 - 第 2 次尝试 (最多 2 次)
[API重试] 生成艺术照 - 第 2 次尝试成功
```

## 性能影响

### 正常情况
- **无额外开销**: 当API调用成功时，不会有额外的性能开销
- **响应时间**: 与原始API调用相同

### 失败重试情况
- **额外延迟**: 重试会增加总响应时间
- **第1次重试**: 增加约1秒延迟（指数退避）
- **第2次重试**: 增加约2秒延迟（指数退避）
- **最大延迟**: 约5秒（退避上限）

### 建议
- 对于关键API调用，建议启用重试机制
- 对于实时性要求极高的API，可以考虑减少重试次数或禁用重试

## 测试

### 运行测试

```bash
cd backend
pnpm test utils/__tests__/apiRetry.test.js
```

### 测试覆盖

测试覆盖了以下场景：
- ✅ 成功的API调用不应重试
- ✅ 失败的API调用应重试1次
- ✅ 连续失败应抛出错误
- ✅ 超时应触发重试
- ✅ 重试回调应被调用
- ✅ 包装后的函数应具有重试能力
- ✅ 网络错误应可重试
- ✅ 5xx服务器错误应可重试
- ✅ 429错误应可重试
- ✅ 4xx客户端错误不应重试
- ✅ 超时错误应可重试
- ✅ 智能重试：可重试错误应触发重试
- ✅ 智能重试：不可重试错误应直接抛出

## 需求追溯

本实现满足以下需求：

- **Requirements 11.1**: 失败自动重试1次，超时时间30秒
- **Property 23**: API重试一致性 - For any 火山引擎API调用失败，系统应该自动重试恰好1次，每次调用的超时时间为30秒

## 未来改进

1. **动态重试策略**: 根据错误类型动态调整重试次数和间隔
2. **熔断机制**: 当连续失败达到阈值时，暂时停止调用
3. **监控告警**: 集成监控系统，当重试率过高时发送告警
4. **重试统计**: 记录重试统计数据，用于性能分析和优化

## 相关文件

- `backend/utils/apiRetry.js` - 重试逻辑实现
- `backend/utils/__tests__/apiRetry.test.js` - 单元测试
- `backend/server.js` - API集成
- `.kiro/specs/ai-family-photo-mvp/requirements.md` - 需求文档
- `.kiro/specs/ai-family-photo-mvp/design.md` - 设计文档
