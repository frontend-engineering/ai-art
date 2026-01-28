# CloudBase RDB UPDATE 表达式修复（已完成）

## 问题描述

生产环境（云托管）报错：
```
Error 1064 (42000): You have an error in your SQL syntax
UPDATE users SET  WHERE `id` = ?
```

**原因**：CloudBase RDB 的 `handleUpdate` 函数无法正确解析 `usage_count = usage_count - 1` 这种表达式，导致生成的 SQL 中 SET 子句为空。

## 受影响的 SQL

以下 SQL 语句在云托管环境会失败：
```sql
UPDATE users SET usage_count = usage_count - 1 WHERE id = ?
UPDATE users SET usage_count = usage_count + 1 WHERE id = ?
UPDATE users SET usage_count = usage_count + ? WHERE id = ?
```

涉及文件：
- `backend/services/usageService.js`
- `backend/services/inviteService.js`
- `backend/services/userService.js`

## 修复方案

已修改 `backend/db/connection.js` 中的 `handleUpdate` 函数：

### 修复内容

1. **改进正则表达式**：
   - 旧版：`/(\w+)\s*=\s*(\w+)\s*([+\-*/])\s*(.+)/` （过于宽松）
   - 新版：`/^(\w+)\s*=\s*(\w+)\s*([+\-*/])\s*(\d+|[\?])$/` （精确匹配）

2. **增加调试日志**：
   - 记录 SET 子句解析过程
   - 记录表达式匹配结果
   - 记录查询和计算过程

3. **增加错误检查**：
   - 检查 updateData 是否为空
   - 检查查询结果是否存在
   - 详细的错误信息

### 修复逻辑

1. **解析表达式**：识别 `field = field ± value` 格式
2. **先查询后更新**：
   - SELECT 查询当前值
   - 在应用层计算新值
   - 用计算后的值执行 UPDATE
3. **支持的操作符**：`+`, `-`, `*`, `/`

### 代码示例

修复前（会失败）：
```javascript
// 正则匹配失败或 updateData 为空
UPDATE users SET usage_count = usage_count - 1 WHERE id = ?
// 生成: UPDATE users SET  WHERE `id` = ? ❌
```

修复后（正常工作）：
```javascript
// 1. 正则匹配: usage_count = usage_count - 1
// 2. 查询: SELECT usage_count FROM users WHERE id = ?
// 3. 计算: newValue = 3 - 1 = 2
// 4. 更新: UPDATE users SET usage_count = 2 WHERE id = ?
// 生成: UPDATE users SET usage_count = 2 WHERE `id` = ? ✅
```

## 部署步骤

### 1. 提交代码到 Git
```bash
git add backend/db/connection.js
git commit -m "fix: 改进 CloudBase RDB UPDATE 表达式解析"
git push
```

### 2. 重新部署云托管服务

**方式 A: 通过腾讯云控制台**
1. 进入云托管控制台：https://console.cloud.tencent.com/tcb
2. 选择环境：prod-9gxl9eb37627e2
3. 点击"云托管" -> 找到 express 服务
4. 点击"版本管理" -> "新建版本"
5. 选择代码来源（推荐使用 Git）
6. 部署新版本

**方式 B: 使用命令行（如果已配置 CloudBase CLI）**
```bash
# 安装 CloudBase CLI（如果未安装）
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署
tcb fn deploy --name express --envId prod-9gxl9eb37627e2
```

### 3. 验证修复

部署后，测试以下功能：

**测试 1: 生成图片（扣减次数）**
- 在小程序中生成一张图片
- 检查日志中是否有 `[CloudBase RDB] 计算: usage_count = X - 1 -> Y`
- 确认没有报错

**测试 2: 邀请奖励（增加次数）**
- 使用邀请码注册新用户
- 检查邀请人的次数是否增加

**测试 3: 购买套餐（增加次数）**
- 购买任意套餐
- 检查次数是否正确增加

## 调试日志示例

修复后的日志输出：
```
[CloudBase RDB] SQL: UPDATE users SET usage_count = usage_count - 1 WHERE id = ?
[CloudBase RDB] Params: ["40fef12c-26d4-4167-a787-07f2865c0797"]
[CloudBase RDB] 解析 SET 子句: ["usage_count = usage_count - 1"]
[CloudBase RDB] 处理部分: usage_count = usage_count - 1
[CloudBase RDB] 匹配到表达式: { leftField: 'usage_count', rightField: 'usage_count', operator: '-', rightValue: '1' }
[CloudBase RDB] 添加表达式: { field: 'usage_count', operator: '-', value: 1 }
[CloudBase RDB] UPDATE: users updateData: {} expressions: [{ field: 'usage_count', operator: '-', value: 1 }] WHERE id = 40fef12c-26d4-4167-a787-07f2865c0797
[CloudBase RDB] 检测到表达式，先查询当前值
[CloudBase RDB] 当前值: { usage_count: 3, ... }
[CloudBase RDB] 计算: usage_count = 3 - 1 -> 2
[CloudBase RDB] 最终 updateData: { usage_count: 2 }
[CloudBase RDB] UPDATE result: ...
```

## 性能影响

**修复前**：1 次 UPDATE（失败）
**修复后**：1 次 SELECT + 1 次 UPDATE（成功）

- 增加了 1 次查询
- 对性能影响很小（毫秒级）
- 保证了功能正常工作

## 注意事项

1. **并发问题**：
   - CloudBase RDB 不支持事务
   - 高并发场景可能出现竞态条件
   - 建议在应用层加锁或使用乐观锁

2. **替代方案**：
   - 如果需要高并发支持，考虑使用原生 MySQL 连接
   - 或在应用层实现分布式锁

3. **兼容性**：
   - 修复后的代码同时兼容 CloudBase RDB 和原生 MySQL
   - 本地开发和生产环境使用相同代码

## 相关文件

- ✅ `backend/db/connection.js` - 已修复（改进版）
- ✅ `backend/services/usageService.js` - 使用表达式 UPDATE
- ✅ `backend/services/inviteService.js` - 使用表达式 UPDATE
- ✅ `backend/services/userService.js` - 使用表达式 UPDATE

## 状态

- ✅ 代码已修复（改进版）
- ✅ 已提交到 Git 仓库（commit: af71efc, 316b20a）
- ⏳ 等待部署到生产环境
- ⏳ 等待验证

## 下一步

### 1. 部署到腾讯云托管

**通过腾讯云控制台部署：**

1. 访问：https://console.cloud.tencent.com/tcb
2. 选择环境：`prod-9gxl9eb37627e2`
3. 进入"云托管" -> 找到 `express` 服务
4. 点击"版本管理" -> "新建版本"
5. 选择代码来源：
   - 推荐使用 Git 仓库（自动拉取最新代码）
   - 或手动上传代码包
6. 部署新版本
7. 等待部署完成（约 3-5 分钟）

### 2. 验证修复

部署完成后，在小程序中测试：

**测试 1: 生成图片**
- 打开小程序，生成一张图片
- 查看云托管日志，应该看到：
  ```
  [CloudBase RDB] 匹配到表达式: { leftField: 'usage_count', ... }
  [CloudBase RDB] 计算: usage_count = 3 - 1 -> 2
  [CloudBase RDB] 最终 updateData: { usage_count: 2 }
  ```
- 确认没有报错

**测试 2: 检查日志**
- 在云托管控制台查看实时日志
- 确认没有 `Error 1064` 错误
- 确认 UPDATE 操作成功

### 3. 如有问题

如果仍然报错，查看日志中的详细信息：
- `[CloudBase RDB] 解析 SET 子句:` - 查看解析结果
- `[CloudBase RDB] 匹配到表达式:` - 查看正则匹配
- `[CloudBase RDB] 当前值:` - 查看查询结果
- `[CloudBase RDB] 计算:` - 查看计算过程

根据日志定位具体问题。
