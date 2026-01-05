# 模式隔离架构说明

## 概述

本项目已完成模式架构优化，将不同模式（时空拼图、富贵变身等）完全隔离，每个模式拥有独立的配置、模板、API和提示词。

## 目录结构

```
src/config/modes/
├── index.ts              # 模式注册中心，提供统一访问接口
├── types.ts              # 类型定义
├── puzzle/               # 时空拼图模式
│   ├── index.ts          # 模式配置入口
│   ├── templates.ts      # 模板列表和分类
│   ├── api.ts            # API配置
│   └── prompts.ts        # 提示词模板
└── transform/            # 富贵变身模式
    ├── index.ts          # 模式配置入口
    ├── templates.ts      # 模板列表和分类
    ├── api.ts            # API配置
    └── prompts.ts        # 提示词模板

backend/config/
└── modes.js              # 后端模式配置
```

## 核心功能

### 1. 模式配置完全隔离

每个模式包含：
- ✅ 独立的模板列表和分类
- ✅ 独立的API端点配置
- ✅ 独立的提示词模板
- ✅ 独立的模型参数
- ✅ 独立的UI主题配置

### 2. 统一访问接口

```typescript
import { 
  getModeConfig,           // 获取模式配置
  getModeTemplates,        // 获取模式模板列表
  getModeTemplateCategories, // 获取模板分类
  getDefaultTemplate,      // 获取默认模板
  getModePrompts,          // 获取提示词列表
  buildPrompt              // 构建提示词
} from '@/config/modes';

// 使用示例
const templates = getModeTemplates('puzzle');
const categories = getModeTemplateCategories('puzzle');
const prompt = buildPrompt('puzzle', 'default', { style: '新中式' });
```

### 3. 前后端配置同步

前端配置：`src/config/modes/`
后端配置：`backend/config/modes.js`

两者保持一致，确保验证规则和参数统一。

## 添加新模式

### 步骤1：创建前端配置

```bash
mkdir -p src/config/modes/newmode
```

创建以下文件：
- `templates.ts` - 定义模板列表和分类
- `api.ts` - 定义API配置
- `prompts.ts` - 定义提示词模板
- `index.ts` - 导出完整配置

### 步骤2：注册模式

在 `src/config/modes/index.ts` 中注册：

```typescript
import { NEW_MODE } from './newmode';

export const MODES: Record<string, ModeConfig> = {
  puzzle: PUZZLE_MODE,
  transform: TRANSFORM_MODE,
  newmode: NEW_MODE  // 添加新模式
};
```

### 步骤3：创建后端配置

在 `backend/config/modes.js` 中添加：

```javascript
const NEW_MODE_CONFIG = {
  id: 'newmode',
  name: '新模式',
  modelParams: { /* ... */ },
  validation: { /* ... */ }
};

const MODES = {
  puzzle: PUZZLE_MODE_CONFIG,
  transform: TRANSFORM_MODE_CONFIG,
  newmode: NEW_MODE_CONFIG  // 添加新模式
};
```

### 步骤4：创建页面和路由

参考现有模式创建对应的页面组件和路由配置。

## 优势

1. **易于维护** - 每个模式独立，修改互不影响
2. **易于扩展** - 添加新模式只需创建新目录
3. **类型安全** - TypeScript类型定义确保配置正确
4. **配置集中** - 所有配置在一处管理
5. **前后端一致** - 配置结构统一，减少错误

## 迁移说明

旧代码使用 `src/config/modes.ts` 仍然兼容，但建议迁移到新的导入方式：

```typescript
// 旧方式（仍然可用）
import { PUZZLE_MODE } from '@/config/modes';

// 新方式（推荐）
import { getModeConfig } from '@/config/modes';
const config = getModeConfig('puzzle');
```

## 详细文档

完整架构设计和实现细节请参考：`docs/MODE_ISOLATION_ARCHITECTURE.md`
