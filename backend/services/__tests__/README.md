# Usage Service Tests

## 测试文件说明

- `usageService.test.js` - 单元测试，测试特定示例和边界情况
- `usageService.property.test.js` - 属性测试，使用 fast-check 进行基于属性的测试

## 运行测试

### 运行所有测试
```bash
pnpm test
```

### 运行单元测试
```bash
pnpm test usageService.test.js
```

### 运行属性测试
```bash
pnpm test usageService.property.test.js
```

## 数据库要求

属性测试需要数据库连接。如果数据库未连接，测试会自动跳过。

### 启动数据库（使用 Docker）
```bash
# 在项目根目录
docker-compose up -d mysql
```

### 运行数据库迁移
```bash
cd backend
pnpm run db:migrate
```

## 属性测试说明

### Property 6: 使用次数精确扣减
- **验证需求**: Requirements 4.1
- **测试内容**: 对于任何 usage_count > 0 的用户，发起生成操作应该使 usage_count 精确减少 1
- **迭代次数**: 100次
- **测试策略**: 使用 fast-check 生成随机初始 usage_count (1-100)，验证扣减后 count 精确减少 1

该属性测试包含4个子测试：
1. 验证扣减后 remaining_count 精确减少 1
2. 验证每次扣减只创建一条日志记录
3. 验证扣减后 usage_count 保持非负
4. 验证扣减前后的关系: new_count = old_count - 1
