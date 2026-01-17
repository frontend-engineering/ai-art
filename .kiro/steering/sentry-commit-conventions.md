---
inclusion: manual
---

# Sentry Commit Message Conventions

遵循 Sentry 项目的提交信息规范。当提交代码、编写提交信息或格式化 git 历史时使用。

## 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Header（必需）**：`<type>(<scope>): <subject>`
- **Scope（可选）**：影响范围
- **所有行不超过 100 字符**

## 提交类型

| 类型 | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `ref` | 重构（无行为变化） |
| `perf` | 性能优化 |
| `docs` | 仅文档更改 |
| `test` | 测试添加或修正 |
| `build` | 构建系统或依赖 |
| `ci` | CI 配置 |
| `chore` | 维护任务 |
| `style` | 代码格式化（无逻辑变化） |
| `meta` | 仓库元数据 |
| `license` | 许可证变更 |

## Subject（主题）规则

- 使用祈使句、现在时："Add feature" 而非 "Added feature"
- 首字母大写
- 结尾不加句号
- 最多 70 字符

## Body（正文）指南

- 解释**做了什么**和**为什么**，而非如何做
- 使用祈使语气和现在时
- 包含变更的动机
- 必要时对比之前的行为

## Footer（页脚）：Issue 引用

在页脚中引用 issue：

```
Fixes GH-1234
Fixes #1234
Fixes SENTRY-1234
Refs LINEAR-ABC-123
```

- `Fixes` - 合并时关闭 issue
- `Refs` - 仅链接不关闭

## AI 生成的变更

当变更主要由 AI 编码助手（如 Kiro）生成时，在页脚添加：

```
Co-Authored-By: Kiro <noreply@kiro.ai>
```

**注意**：这是唯一应该出现的 AI 标识。不要在主题、正文或其他地方添加 "AI 生成"、"由 Kiro 编写" 等标记。

## 示例

### 简单修复

```
fix(api): Handle null response in user endpoint

The user API could return null for deleted accounts, causing a crash
in the dashboard. Add null check before accessing user properties.

Fixes SENTRY-5678
Co-Authored-By: Kiro <noreply@kiro.ai>
```

### 带作用域的新功能

```
feat(alerts): Add Slack thread replies for alert updates

When an alert is updated or resolved, post a reply to the original
Slack thread instead of creating a new message. This keeps related
notifications grouped together.

Refs GH-1234
```

### 重构

```
ref: Extract common validation logic to shared module

Move duplicate validation code from three endpoints into a shared
validator class. No behavior change.
```

### 破坏性变更

```
feat(api)!: Remove deprecated v1 endpoints

Remove all v1 API endpoints that were deprecated in version 23.1.
Clients should migrate to v2 endpoints.

BREAKING CHANGE: v1 endpoints no longer available
Fixes SENTRY-9999
```

### 回滚格式

```
revert: feat(api): Add new endpoint

This reverts commit abc123def456.

Reason: Caused performance regression in production.
```

## 分支命名规范

在提交前，确保在功能分支上工作，而非主分支。

```bash
# 检查当前分支
git branch --show-current

# 如果在 main/master，创建新分支
git checkout -b <type>/<short-description>
```

分支命名模式：`<type>/<short-description>`
- 示例：`feat/add-user-auth`、`fix/null-pointer-error`、`ref/extract-validation`

## 原则

- 每个提交应该是单一、稳定的变更
- 提交应该可以独立审查
- 每次提交后仓库应处于可工作状态

## 参考

- [Sentry Commit Messages](https://develop.sentry.dev/engineering-practices/commit-messages/)
