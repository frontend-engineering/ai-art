# AI全家福管理后台

## 项目说明

这是AI全家福项目的管理后台系统，用于运营管理、数据监控、配置管理等功能。

## 技术栈

- React 18
- TypeScript
- Ant Design 5
- Vite
- React Router 6
- Axios
- ECharts

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 运行测试
pnpm test
```

## 项目结构

```
admin/
├── src/
│   ├── pages/          # 页面组件
│   ├── components/     # 通用组件
│   ├── services/       # API服务
│   ├── hooks/          # 自定义Hooks
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript类型定义
│   ├── App.tsx         # 应用入口
│   └── main.tsx        # 主入口
├── package.json
└── vite.config.ts
```

## 注意事项

- 使用 pnpm 作为包管理器
- 遵守项目的 DEVELOPMENT_RULES.md
- 所有代码必须通过 TypeScript 类型检查
- 所有代码必须通过 ESLint 检查
