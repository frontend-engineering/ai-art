# Implementation Plan: 管理后台系统

## Overview

本实现计划将管理后台系统分解为可执行的开发任务。采用增量开发方式，先搭建基础架构，然后逐步实现各功能模块。所有任务都基于设计文档，确保实现符合需求规范。

## Tasks

- [x] 1. 项目初始化与基础架构搭建
  - 创建 `admin/` 目录结构
  - 初始化前端项目（React + TypeScript + Vite）
  - 配置 Ant Design 5 和 ECharts
  - 配置 TypeScript 和 ESLint
  - 创建基础路由结构
  - _Requirements: 1.1, 1.2_

- [x] 2. 数据库表结构创建
  - [x] 2.1 创建管理员用户表 (admin_users)
    - 编写数据库迁移脚本
    - 包含用户名、密码哈希、角色、状态等字段
    - 添加必要的索引
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.2 创建价格配置表 (price_configs)
    - 编写数据库迁移脚本
    - 包含类别、代码、价格、生效时间等字段
    - 添加唯一索引和外键约束
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.3 创建价格历史表 (price_history)
    - 编写数据库迁移脚本
    - 记录价格变更历史
    - 关联价格配置表和管理员表
    - _Requirements: 5.3_

  - [x] 2.4 创建操作日志表 (admin_operation_logs)
    - 编写数据库迁移脚本
    - 记录所有管理员操作
    - 包含请求信息、IP地址等
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 2.5 创建系统配置表 (system_configs)
    - 编写数据库迁移脚本
    - 支持不同类型的配置值
    - 标记敏感信息
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 2.6 创建模板配置表 (template_configs)
    - 编写数据库迁移脚本
    - 支持多种模式的模板
    - 记录使用统计
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.7 执行数据库迁移并验证
    - 运行迁移脚本
    - 验证表结构正确性
    - 创建初始管理员账户
    - _Requirements: 1.1, 1.2_

- [x] 3. 后端认证与权限系统
  - [x] 3.1 实现管理员认证服务 (adminAuthService.js)
    - 实现密码哈希和验证（使用bcrypt）
    - 实现JWT token生成和验证
    - 实现登录尝试限制和账户锁定
    - 实现会话超时管理
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 3.2 编写认证服务单元测试
    - 测试密码验证逻辑
    - 测试JWT token生成和验证
    - 测试账户锁定机制
    - _Requirements: 1.2, 1.3_

  - [x] 3.3 实现认证中间件 (adminAuth.js)
    - 验证JWT token
    - 检查会话有效性
    - 处理未授权请求
    - _Requirements: 1.1, 1.4_

  - [x] 3.4 实现权限中间件 (adminPermission.js)
    - 基于角色的访问控制
    - 检查用户权限
    - 返回权限不足错误
    - _Requirements: 1.5_

  - [ ]* 3.5 编写权限中间件单元测试
    - 测试不同角色的权限检查
    - 测试权限拒绝场景
    - _Requirements: 1.5_

- [x] 4. 后端管理API路由 - 认证模块
  - [x] 4.1 实现登录API (POST /admin-api/auth/login)
    - 验证用户名和密码
    - 生成JWT token
    - 记录登录日志
    - 处理登录失败和账户锁定
    - _Requirements: 1.2, 1.3_

  - [x] 4.2 实现登出API (POST /admin-api/auth/logout)
    - 使token失效
    - 记录登出日志
    - _Requirements: 1.4_

  - [x] 4.3 实现获取当前用户信息API (GET /admin-api/auth/me)
    - 返回当前登录用户信息
    - 包含角色和权限信息
    - _Requirements: 1.5_

  - [ ]* 4.4 编写认证API集成测试
    - 测试完整的登录流程
    - 测试登出流程
    - 测试token验证
    - _Requirements: 1.2, 1.4_

- [x] 5. 前端认证页面
  - [x] 5.1 实现登录页面组件 (Login.tsx)
    - 创建登录表单（用户名、密码）
    - 实现表单验证
    - 调用登录API
    - 处理登录成功和失败
    - 保存token到localStorage
    - _Requirements: 1.2_

  - [x] 5.2 实现路由守卫 (AuthGuard.tsx)
    - 检查用户登录状态
    - 未登录重定向到登录页
    - 验证token有效性
    - _Requirements: 1.1_

  - [x] 5.3 实现布局组件 (AdminLayout.tsx)
    - 创建顶部导航栏
    - 创建左侧菜单栏
    - 显示用户信息和登出按钮
    - _Requirements: 1.1, 1.4_

  - [ ]* 5.4 编写登录页面单元测试
    - 测试表单验证
    - 测试登录成功场景
    - 测试登录失败场景
    - _Requirements: 1.2_

- [x] 6. Checkpoint - 认证系统验证
  - ✅ 确保所有认证相关测试通过
  - ✅ 手动测试登录、登出流程
  - ✅ 验证路由守卫正常工作
  - ⚠️ **验证现有功能：运行现有测试套件，确保小程序端和H5端功能正常**
  - ⚠️ **验证数据库：确认新表创建成功，现有表未被修改**
  - 🛑 如有任何问题，立即停止并向用户反馈

- [x] 7. 后端价格配置服务与API
  - [x] 7.1 实现价格配置服务 (priceConfigService.js)
    - 实现价格配置CRUD操作
    - 实现价格历史记录功能
    - 实现定时生效价格查询
    - 实现当前有效价格查询（带5分钟缓存）
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 编写价格配置服务单元测试
    - 测试价格创建和更新
    - 测试价格历史记录
    - 测试定时生效逻辑
    - _Requirements: 5.2, 5.3, 5.5_

  - [x] 7.3 实现价格配置管理API
    - GET /admin-api/prices - 获取价格列表
    - POST /admin-api/prices - 创建价格配置
    - PUT /admin-api/prices/:id - 更新价格配置
    - DELETE /admin-api/prices/:id - 停用价格配置
    - GET /admin-api/prices/history/:id - 获取价格历史
    - GET /admin-api/prices/history/code/:code - 获取指定代码的价格历史
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.4 实现公共价格查询API (GET /api/prices/current)
    - 返回当前有效的所有价格配置
    - 支持按类别筛选
    - 缓存价格数据（5分钟）
    - _Requirements: 5.4_

  - [x] 7.5 注册价格配置路由
    - 在 backend/routes/index.js 中注册路由
    - 管理后台路由使用 /admin-api/prices 前缀
    - 公开API路由使用 /api/prices 前缀
    - _Requirements: 5.1_

  - [x] 7.6 创建前端价格管理页面
    - admin/src/pages/Prices/index.tsx - 完整的价格管理界面
    - admin/src/services/price.ts - 价格API服务
    - 集成到 App.tsx 路由
    - 安装 dayjs 依赖
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.7 修复权限控制问题
    - 修复 adminAuth.js 中的 authorize 中间件
    - 确保 req.admin 和 req.user 都被正确设置
    - 修复路由中 authorize 的调用方式
    - _Requirements: 1.5_

  - [x] 7.8 API测试验证
    - 测试所有API端点功能正常
    - 验证权限控制正确
    - 验证价格历史记录
    - 验证缓存机制
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.9 编写价格配置API集成测试
    - 测试价格CRUD操作
    - 测试价格历史记录
    - 测试公共API返回正确价格
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 7.10 编写价格配置属性测试
    - **Property 21: Price Update Immediate Effect**
    - **Validates: Requirements 5.2**

  - [ ]* 7.11 编写价格历史属性测试
    - **Property 22: Price History Recording**
    - **Validates: Requirements 5.3**

  **Status**: ✅ COMPLETED (核心功能已实现，测试任务标记为可选)
  **Files Created**:
  - backend/services/priceConfigService.js
  - backend/routes/priceConfigRoutes.js
  - admin/src/pages/Prices/index.tsx
  - admin/src/services/price.ts
  **Files Modified**:
  - backend/routes/index.js
  - backend/middleware/adminAuth.js
  - admin/src/App.tsx

- [x] 8. 前端价格配置管理页面
  - [x] 8.1 实现价格配置列表组件 (PriceList.tsx)
    - 展示所有价格配置
    - 支持按类别筛选
    - 支持搜索功能
    - _Requirements: 5.1_

  - [x] 8.2 实现价格配置编辑表单 (PriceForm.tsx)
    - 创建/编辑价格配置
    - 表单验证（价格范围、必填项）
    - 支持设置生效时间
    - _Requirements: 5.2, 5.5_

  - [x] 8.3 实现价格历史查看组件 (PriceHistory.tsx)
    - 展示价格变更历史
    - 显示变更人和变更时间
    - 显示变更原因
    - _Requirements: 5.3_

  - [ ]* 8.4 编写价格配置页面单元测试
    - 测试列表渲染
    - 测试表单验证
    - 测试价格更新流程
    - _Requirements: 5.1, 5.2_

- [x] 9. 后端用户管理API
  - [x] 9.1 实现用户管理API
    - GET /admin-api/users - 获取用户列表（支持分页、筛选）
    - GET /admin-api/users/:id - 获取用户详情
    - PUT /admin-api/users/:id/payment-status - 更新付费状态
    - GET /admin-api/users/export - 导出用户数据
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 9.2 编写用户管理API集成测试
    - 测试用户列表查询和筛选
    - 测试用户详情查询
    - 测试付费状态更新
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 9.3 编写用户筛选属性测试
    - **Property 5: User Search Filtering**
    - **Validates: Requirements 2.2**

- [x] 10. 前端用户管理页面
  - [x] 10.1 实现用户列表组件 (UserList.tsx)
    - 展示用户列表（表格形式）
    - 支持搜索和筛选
    - 支持分页
    - _Requirements: 2.1, 2.2_

  - [x] 10.2 实现用户详情抽屉 (UserDetail.tsx)
    - 展示用户完整信息
    - 展示生成历史
    - 展示订单记录
    - _Requirements: 2.3_

  - [x] 10.3 实现付费状态修改功能
    - 修改用户付费状态
    - 记录操作日志
    - _Requirements: 2.4_

  - [x] 10.4 实现用户数据导出功能
    - 导出为Excel文件
    - 包含所有筛选后的用户
    - _Requirements: 2.5_

  - [ ]* 10.5 编写用户管理页面单元测试
    - 测试列表渲染
    - 测试筛选功能
    - 测试详情展示
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 11. 后端订单管理API
  - [x] 11.1 实现订单管理API
    - GET /admin-api/orders - 获取订单列表（支持分页、筛选）
    - GET /admin-api/orders/:id - 获取订单详情
    - PUT /admin-api/orders/:id/status - 更新订单状态
    - POST /admin-api/orders/:id/refund - 处理退款
    - GET /admin-api/orders/export - 导出订单数据
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 11.2 编写订单管理API集成测试
    - 测试订单列表查询和筛选
    - 测试订单详情查询
    - 测试订单状态更新
    - 测试退款流程
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 11.3 编写订单筛选属性测试
    - **Property 10: Order Filtering Accuracy**
    - **Validates: Requirements 3.2**

- [x] 12. 前端订单管理页面
  - [x] 12.1 实现订单列表组件 (OrderList.tsx)
    - 展示所有订单（支付订单+产品订单）
    - 支持按类型、状态、时间筛选
    - 支持分页
    - _Requirements: 3.1, 3.2_

  - [x] 12.2 实现订单详情抽屉 (OrderDetail.tsx)
    - 展示订单完整信息
    - 展示关联用户信息
    - 展示支付信息
    - _Requirements: 3.3_

  - [x] 12.3 实现订单状态更新功能
    - 更新实体产品订单状态
    - 支持批量更新
    - _Requirements: 3.4_

  - [x] 12.4 实现退款处理功能
    - 调用微信支付退款接口
    - 更新订单状态
    - 显示退款结果
    - _Requirements: 3.6_

  - [x] 12.5 实现订单数据导出功能
    - 导出为Excel文件
    - 包含订单详情和用户信息
    - _Requirements: 3.5_

  - [ ]* 12.6 编写订单管理页面单元测试
    - 测试列表渲染
    - 测试筛选功能
    - 测试状态更新
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 13. Checkpoint - 核心功能验证
  - ✅ 确保价格配置、用户管理、订单管理功能正常
  - ✅ 验证数据导出功能
  - ✅ 验证操作日志记录
  - ✅ **验证现有功能：测试小程序端支付流程正常**
  - ✅ **验证现有功能：测试H5端图片生成功能正常**
  - ✅ **验证现有功能：测试云函数支付回调正常**
  - ✅ **验证数据完整性：确认现有订单数据未被修改**
  - ✅ **验证API兼容性：现有API（/api/*）全部正常响应**
  - 🛑 如有任何问题，立即停止并向用户反馈


- [x] 14. 后端统计与数据看板API
  - [x] 14.1 实现统计服务 (statsService.js)
    - 实现今日数据统计（新增用户、收入、订单）
    - 实现趋势数据计算（7天、30天）
    - 实现用户分布统计
    - 实现套餐销售分布统计
    - _Requirements: 4.1, 4.2, 4.5, 8.1, 8.2, 8.4_

  - [ ]* 14.2 编写统计服务单元测试
    - 测试统计数据计算准确性
    - 测试时间范围筛选
    - 测试百分比计算
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 14.3 实现数据看板API
    - GET /admin-api/stats/dashboard - 获取看板数据
    - GET /admin-api/stats/revenue - 获取收入统计
    - GET /admin-api/stats/users - 获取用户统计
    - GET /admin-api/stats/templates - 获取热门模板
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [ ]* 14.4 编写统计API集成测试
    - 测试看板数据返回
    - 测试收入统计计算
    - 测试用户分布计算
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 14.5 编写套餐分布属性测试
    - **Property 19: Package Distribution Sum**
    - **Validates: Requirements 4.5**

  - [ ]* 14.6 编写用户分布属性测试
    - **Property 37: User Distribution Sum**
    - **Validates: Requirements 8.4**

- [x] 15. 前端数据看板页面
  - [x] 15.1 实现数据看板组件 (Dashboard.tsx)
    - 展示核心指标卡片（今日数据）
    - 实现自动刷新（30秒）
    - _Requirements: 8.1, 8.3_

  - [x] 15.2 实现趋势图表组件 (TrendCharts.tsx)
    - 使用ECharts展示用户增长趋势
    - 展示收入趋势
    - 支持切换时间范围（7天/30天）
    - _Requirements: 8.2_

  - [x] 15.3 实现分布图表组件 (DistributionCharts.tsx)
    - 展示用户分布饼图
    - 展示套餐销售分布
    - _Requirements: 8.4_

  - [x] 15.4 实现热门模板组件 (PopularTemplates.tsx)
    - 展示使用次数最多的前10个模板
    - 显示使用次数和趋势
    - _Requirements: 8.5_

  - [ ]* 15.5 编写数据看板页面单元测试
    - 测试指标卡片渲染
    - 测试图表数据展示
    - _Requirements: 8.1, 8.2_

- [ ] 16. 后端模板管理API
  - [ ] 16.1 实现模板管理API
    - GET /admin-api/templates - 获取模板列表
    - POST /admin-api/templates - 创建模板（上传到OSS）
    - PUT /admin-api/templates/:id - 更新模板信息
    - DELETE /admin-api/templates/:id - 删除模板（软删除）
    - GET /admin-api/templates/stats - 获取模板统计
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 16.2 编写模板管理API集成测试
    - 测试模板CRUD操作
    - 测试OSS上传
    - 测试模板统计
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 16.3 编写模板上传属性测试
    - **Property 26: Template Upload Integrity**
    - **Validates: Requirements 6.2**

- [ ] 17. 前端模板管理页面
  - [ ] 17.1 实现模板列表组件 (TemplateList.tsx)
    - 展示所有模板（网格或列表视图）
    - 支持按模式筛选
    - 显示使用统计
    - _Requirements: 6.1, 6.5_

  - [ ] 17.2 实现模板上传组件 (TemplateUpload.tsx)
    - 图片上传功能
    - 表单填写（名称、描述、模式）
    - 上传进度显示
    - _Requirements: 6.2_

  - [ ] 17.3 实现模板编辑功能
    - 编辑模板信息
    - 修改排序
    - 上架/下架模板
    - _Requirements: 6.3, 6.4_

  - [ ]* 17.4 编写模板管理页面单元测试
    - 测试列表渲染
    - 测试上传功能
    - 测试编辑功能
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 18. 后端生成历史监控API
  - [ ] 18.1 实现生成历史API
    - GET /admin-api/generations - 获取生成历史列表
    - GET /admin-api/generations/:id - 获取生成详情
    - POST /admin-api/generations/:id/retry - 重试失败任务
    - GET /admin-api/generations/stats - 获取生成统计
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 18.2 编写生成历史API集成测试
    - 测试历史列表查询
    - 测试失败任务筛选
    - 测试任务重试
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 18.3 编写失败任务筛选属性测试
    - **Property 31: Failed Task Filtering**
    - **Validates: Requirements 7.2**

- [ ] 19. 前端生成历史监控页面
  - [ ] 19.1 实现生成历史列表组件 (GenerationList.tsx)
    - 展示所有生成记录
    - 支持按状态筛选
    - 显示任务状态标签
    - _Requirements: 7.1, 7.2_

  - [ ] 19.2 实现生成详情抽屉 (GenerationDetail.tsx)
    - 展示原始图片
    - 展示模板和生成结果
    - 显示任务ID和状态
    - _Requirements: 7.3_

  - [ ] 19.3 实现任务重试功能
    - 重试失败任务
    - 显示重试结果
    - _Requirements: 7.4_

  - [ ] 19.4 实现生成统计组件 (GenerationStats.tsx)
    - 展示成功率
    - 展示平均生成时间
    - 展示失败原因分布
    - _Requirements: 7.5_

  - [ ]* 19.5 编写生成历史页面单元测试
    - 测试列表渲染
    - 测试筛选功能
    - 测试重试功能
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 20. 后端系统配置API
  - [ ] 20.1 实现系统配置API
    - GET /admin-api/configs - 获取所有配置
    - PUT /admin-api/configs/:key - 更新配置
    - POST /admin-api/configs/validate - 验证配置有效性
    - GET /admin-api/api-keys - 获取API密钥列表
    - POST /admin-api/api-keys - 生成新API密钥
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 20.2 编写系统配置API集成测试
    - 测试配置CRUD操作
    - 测试配置验证
    - 测试API密钥生成
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ]* 20.3 编写配置验证属性测试
    - **Property 40: Config Validation**
    - **Validates: Requirements 9.2**

  - [ ]* 20.4 编写API密钥唯一性属性测试
    - **Property 43: API Key Uniqueness**
    - **Validates: Requirements 9.5**

- [ ] 21. 前端系统配置页面
  - [ ] 21.1 实现系统配置列表组件 (ConfigList.tsx)
    - 展示所有配置项
    - 按类别分组显示
    - 标记敏感信息
    - _Requirements: 9.1_

  - [ ] 21.2 实现配置编辑表单 (ConfigForm.tsx)
    - 编辑配置值
    - 配置验证
    - 敏感信息脱敏显示
    - _Requirements: 9.2, 9.3_

  - [ ] 21.3 实现API密钥管理组件 (ApiKeyManagement.tsx)
    - 展示API密钥列表
    - 生成新密钥
    - 显示使用情况
    - _Requirements: 9.4, 9.5_

  - [ ]* 21.4 编写系统配置页面单元测试
    - 测试配置列表渲染
    - 测试配置编辑
    - 测试API密钥生成
    - _Requirements: 9.1, 9.2, 9.5_

- [ ] 22. 后端日志监控API
  - [ ] 22.1 实现操作日志中间件 (adminLogger.js)
    - 记录所有管理员操作
    - 记录请求信息和IP地址
    - 异步写入数据库
    - _Requirements: 10.1_

  - [ ] 22.2 实现操作日志API
    - GET /admin-api/logs/operations - 获取操作日志
    - GET /admin-api/logs/operations/export - 导出日志
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 22.3 实现错误日志API
    - GET /admin-api/logs/errors - 获取错误日志
    - GET /admin-api/logs/errors/:id - 获取错误详情
    - PUT /admin-api/logs/errors/:id/resolve - 标记错误已处理
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

  - [ ] 22.4 实现敏感操作通知功能
    - 检测敏感操作
    - 发送通知给超级管理员
    - _Requirements: 10.5, 11.4_

  - [ ]* 22.5 编写日志API集成测试
    - 测试操作日志记录
    - 测试日志筛选
    - 测试错误日志查询
    - _Requirements: 10.1, 10.2, 11.1_

  - [ ]* 22.6 编写操作日志属性测试
    - **Property 44: Operation Logging**
    - **Validates: Requirements 10.1**

- [ ] 23. 前端日志监控页面
  - [ ] 23.1 实现操作日志列表组件 (OperationLogs.tsx)
    - 展示所有操作日志
    - 支持按操作人、类型、时间筛选
    - 支持导出
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 23.2 实现错误日志列表组件 (ErrorLogs.tsx)
    - 展示所有错误日志
    - 支持按类型、严重程度筛选
    - 显示错误状态
    - _Requirements: 11.1, 11.2_

  - [ ] 23.3 实现错误详情抽屉 (ErrorDetail.tsx)
    - 展示完整错误堆栈
    - 展示上下文信息
    - 提供标记已处理功能
    - _Requirements: 11.3, 11.5_

  - [ ]* 23.4 编写日志监控页面单元测试
    - 测试日志列表渲染
    - 测试筛选功能
    - 测试错误详情展示
    - _Requirements: 10.2, 11.1, 11.3_

- [ ] 24. 数据导出功能增强
  - [ ] 24.1 实现通用导出服务 (exportService.js)
    - 支持Excel格式导出
    - 支持自定义字段选择
    - 支持大数据量异步导出
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 24.2 实现异步导出任务队列
    - 创建导出任务
    - 后台处理导出
    - 通过邮件发送下载链接
    - _Requirements: 12.5_

  - [ ] 24.3 实现自定义报表API
    - POST /admin-api/reports/custom - 创建自定义报表
    - 支持字段选择和筛选条件
    - _Requirements: 12.4_

  - [ ]* 24.4 编写导出功能集成测试
    - 测试小数据量导出
    - 测试自定义字段导出
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 24.5 编写自定义报表属性测试
    - **Property 57: Custom Report Field Selection**
    - **Validates: Requirements 12.4**

- [ ] 25. 前端数据导出功能
  - [ ] 25.1 实现导出按钮组件 (ExportButton.tsx)
    - 通用导出按钮
    - 显示导出进度
    - 处理导出结果
    - _Requirements: 2.5, 3.5, 10.4_

  - [ ] 25.2 实现自定义报表对话框 (CustomReportDialog.tsx)
    - 选择导出字段
    - 设置筛选条件
    - 预览报表结构
    - _Requirements: 12.4_

  - [ ]* 25.3 编写导出功能单元测试
    - 测试导出按钮交互
    - 测试自定义报表配置
    - _Requirements: 12.4_

- [ ] 26. Checkpoint - 完整功能验证
  - ✅ 确保所有功能模块正常工作
  - ✅ 验证数据看板实时刷新
  - ✅ 验证日志记录完整性
  - ✅ 验证导出功能
  - ⚠️ **完整回归测试：运行所有现有测试套件**
  - ⚠️ **端到端测试：测试小程序完整用户流程（注册→上传→生成→支付）**
  - ⚠️ **端到端测试：测试H5完整用户流程**
  - ⚠️ **性能测试：确认响应时间未劣化**
  - ⚠️ **数据一致性：验证所有数据表数据完整**
  - 🛑 如有任何问题，立即停止并向用户反馈

- [ ] 27. 价格配置迁移与集成
  - [x] 27.1 迁移现有价格到数据库
    - 从代码中提取现有价格配置（backend/routes/paymentRoutes.js中的PACKAGE_PRICES）
    - 写入price_configs表
    - 验证数据完整性
    - ⚠️ **保留原有代码作为备份，不要删除**
    - _Requirements: 5.1, 5.2_

  - [x] 27.2 更新后端支付路由使用新价格API
    - 修改 backend/routes/paymentRoutes.js
    - 从数据库查询价格，替代硬编码的PACKAGE_PRICES
    - ⚠️ **添加降级机制：如果数据库查询失败，使用默认价格**
    - ⚠️ **测试支付流程：确保创建订单、支付、回调全部正常**
    - _Requirements: 5.4_

  - [x] 27.3 更新小程序端价格查询
    - 修改小程序支付相关代码调用新的价格API（GET /api/prices/current）
    - 在 miniprogram/utils/cloudbase-payment.js 中集成
    - ⚠️ **添加缓存机制：避免频繁请求**
    - ⚠️ **添加降级机制：API失败时使用本地默认价格**
    - ⚠️ **完整测试：在小程序中测试支付流程**
    - _Requirements: 5.4_

  - [x] 27.4 更新H5端价格查询
    - 修改H5支付相关代码调用新的价格API
    - 在 src/components/PaymentModal.tsx 中集成
    - ⚠️ **添加缓存机制：使用React Query或SWR**
    - ⚠️ **添加降级机制：API失败时使用本地默认价格**
    - ⚠️ **完整测试：在H5中测试支付流程**
    - _Requirements: 5.4_

  - [x] 27.5 更新云函数价格查询
    - 修改云函数支付代码调用新的价格API
    - 在 miniprogram/cloudfunctions/wxpayFunctions/wxpay_order/index.js 中集成
    - ⚠️ **添加降级机制：API失败时使用默认价格**
    - ⚠️ **完整测试：测试云函数支付流程**
    - _Requirements: 5.4_

  - [ ] 27.6 价格配置迁移验证
    - ✅ 验证所有端都能正确获取价格
    - ✅ 验证价格更新后各端立即生效
    - ✅ 验证降级机制正常工作
    - ⚠️ **完整支付流程测试：小程序端、H5端、云函数**
    - ⚠️ **价格一致性测试：确保所有端显示的价格一致**
    - ⚠️ **回滚准备：如有问题，可以快速回滚到硬编码价格**
    - 🛑 如有任何问题，立即停止并向用户反馈

  - [ ]* 27.7 编写价格查询API属性测试
    - **Property 23: Price Query API Currency**
    - **Validates: Requirements 5.4**

- [ ] 28. 性能优化与缓存
  - [x] 28.1 实现价格配置缓存
    - 使用内存缓存（5分钟）
    - 价格更新时清除缓存
    - _Requirements: 5.4_

  - [x] 28.2 实现统计数据缓存
    - 缓存看板数据（1分钟）
    - 缓存趋势数据（5分钟）
    - _Requirements: 8.1, 8.2_

  - [ ] 28.3 优化数据库查询
    - 添加必要的索引
    - 优化复杂查询
    - 使用连接池
    - _Requirements: 所有查询相关需求_

  - [ ]* 28.4 编写性能测试
    - 测试API响应时间
    - 测试并发请求处理
    - 测试缓存效果

- [x] 29. 属性测试框架搭建
  - [x] 29.1 安装fast-check依赖
    - 在backend目录安装fast-check
    - 配置Jest支持属性测试
    - _Requirements: 所有属性测试需求_

  - [x] 29.2 创建属性测试工具函数
    - 创建测试数据生成器（用户、订单、价格等）
    - 创建测试辅助函数
    - 创建测试清理函数
    - _Requirements: 所有属性测试需求_

  - [x]* 29.3 编写示例属性测试
    - 实现Property 21: Price Update Immediate Effect
    - 实现Property 22: Price History Recording
    - 验证属性测试框架正常工作
    - _Requirements: 5.2, 5.3_

- [ ] 30. 模板管理功能实现
  - [ ] 30.1 实现后端模板管理API
    - GET /admin-api/templates - 获取模板列表
    - POST /admin-api/templates - 创建模板（上传到OSS）
    - PUT /admin-api/templates/:id - 更新模板信息
    - DELETE /admin-api/templates/:id - 删除模板（软删除）
    - GET /admin-api/templates/stats - 获取模板统计
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 30.2 实现前端模板管理页面
    - 创建 admin/src/pages/Templates/index.tsx
    - 实现模板列表展示（网格或列表视图）
    - 实现模板上传功能
    - 实现模板编辑功能（名称、描述、排序、上架/下架）
    - 显示模板使用统计
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 30.3 注册模板管理路由
    - 在 backend/routes/index.js 中注册路由
    - 在 admin/src/App.tsx 中更新路由
    - _Requirements: 6.1_

  - [ ]* 30.4 编写模板管理测试
    - 测试模板CRUD操作
    - 测试OSS上传
    - 测试模板统计
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 31. 系统配置功能实现
  - [ ] 31.1 实现后端系统配置API
    - GET /admin-api/configs - 获取所有配置
    - PUT /admin-api/configs/:key - 更新配置
    - POST /admin-api/configs/validate - 验证配置有效性
    - GET /admin-api/api-keys - 获取API密钥列表
    - POST /admin-api/api-keys - 生成新API密钥
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 31.2 实现前端系统配置页面
    - 创建 admin/src/pages/Config/index.tsx
    - 实现配置列表展示（按类别分组）
    - 实现配置编辑表单（敏感信息脱敏）
    - 实现API密钥管理组件
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 31.3 注册系统配置路由
    - 在 backend/routes/index.js 中注册路由
    - 在 admin/src/App.tsx 中更新路由
    - _Requirements: 9.1_

  - [ ]* 31.4 编写系统配置测试
    - 测试配置CRUD操作
    - 测试配置验证
    - 测试API密钥生成
    - _Requirements: 9.1, 9.2, 9.5_

- [ ] 32. 日志监控功能实现
  - [ ] 32.1 实现后端日志监控API
    - GET /admin-api/logs/operations - 获取操作日志
    - GET /admin-api/logs/operations/export - 导出日志
    - GET /admin-api/logs/errors - 获取错误日志
    - GET /admin-api/logs/errors/:id - 获取错误详情
    - PUT /admin-api/logs/errors/:id/resolve - 标记错误已处理
    - _Requirements: 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.5_

  - [ ] 32.2 实现敏感操作通知功能
    - 检测敏感操作
    - 发送通知给超级管理员
    - _Requirements: 10.5, 11.4_

  - [ ] 32.3 实现前端日志监控页面
    - 创建 admin/src/pages/Logs/index.tsx
    - 实现操作日志列表组件（支持筛选、导出）
    - 实现错误日志列表组件（支持筛选）
    - 实现错误详情抽屉（显示堆栈、标记已处理）
    - _Requirements: 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.5_

  - [ ] 32.4 注册日志监控路由
    - 在 backend/routes/index.js 中注册路由
    - 在 admin/src/App.tsx 中更新路由
    - _Requirements: 10.1_

  - [ ]* 32.5 编写日志监控测试
    - 测试操作日志记录
    - 测试日志筛选
    - 测试错误日志查询
    - _Requirements: 10.1, 10.2, 11.1_

- [ ] 33. 生成历史监控功能实现
  - [ ] 33.1 实现后端生成历史API
    - GET /admin-api/generations - 获取生成历史列表
    - GET /admin-api/generations/:id - 获取生成详情
    - POST /admin-api/generations/:id/retry - 重试失败任务
    - GET /admin-api/generations/stats - 获取生成统计
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 33.2 实现前端生成历史监控页面
    - 创建生成历史列表组件（支持按状态筛选）
    - 创建生成详情抽屉（显示原始图片、模板、结果）
    - 实现任务重试功能
    - 实现生成统计组件（成功率、平均时间、失败原因分布）
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 33.3 注册生成历史路由
    - 在 backend/routes/index.js 中注册路由
    - 在 admin/src/App.tsx 中添加路由
    - _Requirements: 7.1_

  - [ ]* 33.4 编写生成历史测试
    - 测试历史列表查询
    - 测试失败任务筛选
    - 测试任务重试
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 34. 数据导出功能增强
  - [ ] 34.1 实现通用导出服务 (exportService.js)
    - 支持Excel格式导出
    - 支持自定义字段选择
    - 支持大数据量异步导出
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 34.2 实现异步导出任务队列
    - 创建导出任务
    - 后台处理导出
    - 通过邮件发送下载链接
    - _Requirements: 12.5_

  - [ ] 34.3 实现自定义报表API
    - POST /admin-api/reports/custom - 创建自定义报表
    - 支持字段选择和筛选条件
    - _Requirements: 12.4_

  - [ ] 34.4 实现前端自定义报表对话框
    - 选择导出字段
    - 设置筛选条件
    - 预览报表结构
    - _Requirements: 12.4_

  - [ ]* 34.5 编写导出功能测试
    - 测试小数据量导出
    - 测试自定义字段导出
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 35. 安全加固
  - [ ] 35.1 实现请求频率限制
    - 限制登录尝试频率
    - 限制API调用频率
    - _Requirements: 1.3_

  - [ ] 35.2 实现SQL注入防护
    - 使用参数化查询
    - 验证所有输入
    - _Requirements: 所有数据库操作_

  - [ ] 35.3 实现XSS防护
    - 前端输入过滤
    - 后端输出转义
    - _Requirements: 所有用户输入_

  - [ ] 35.4 实现CSRF防护
    - 添加CSRF token
    - 验证请求来源
    - _Requirements: 所有修改操作_

  - [ ]* 35.5 编写安全测试
    - 测试SQL注入防护
    - 测试XSS防护
    - 测试CSRF防护

- [ ] 36. Checkpoint - 完整功能验证
  - ✅ 确保所有功能模块正常工作
  - ✅ 验证数据看板实时刷新
  - ✅ 验证日志记录完整性
  - ✅ 验证导出功能
  - ⚠️ **完整回归测试：运行所有现有测试套件**
  - ⚠️ **端到端测试：测试小程序完整用户流程（注册→上传→生成→支付）**
  - ⚠️ **端到端测试：测试H5完整用户流程**
  - ⚠️ **性能测试：确认响应时间未劣化**
  - ⚠️ **数据一致性：验证所有数据表数据完整**
  - 🛑 如有任何问题，立即停止并向用户反馈

- [ ] 37. 部署配置与文档
  - [ ] 37.1 编写部署脚本
    - 前端构建脚本
    - 后端启动脚本
    - 数据库迁移脚本
    - _Requirements: 所有功能_

  - [ ] 37.2 编写环境配置文件
    - 开发环境配置
    - 生产环境配置
    - 配置说明文档
    - _Requirements: 所有功能_

  - [ ] 37.3 编写管理员使用手册
    - 功能说明
    - 操作指南
    - 常见问题解答
    - _Requirements: 所有功能_

  - [ ] 37.4 编写开发者文档
    - API文档
    - 数据库设计文档
    - 架构说明
    - _Requirements: 所有功能_

  - [ ] 37.5 清理项目文件
    - 删除所有临时文件和备份文件
    - 删除冗余的脚本和配置
    - 合并多余的文档文件（保留最多一个MD说明文档）
    - 确保项目结构清晰简洁
    - _Requirements: 开发规则_

- [ ] 38. Final Checkpoint - 完整系统测试与上线准备
  - ✅ 运行所有单元测试和属性测试
  - ✅ 执行端到端测试
  - ✅ 验证所有功能正常工作
  - ✅ 验证价格配置在所有端正确显示
  - ✅ 性能测试和压力测试
  - ✅ 安全测试
  - ⚠️ **商业化上线检查清单：**
    - [ ] 小程序端完整用户流程测试（注册→上传→选模板→生成→支付→下载）
    - [ ] H5端完整用户流程测试
    - [ ] 管理后台所有功能测试
    - [ ] 价格配置管理测试（修改价格→各端立即生效）
    - [ ] 支付流程测试（微信支付JSAPI、Native）
    - [ ] 退款流程测试
    - [ ] 订单管理测试
    - [ ] 数据导出测试
    - [ ] 错误日志监控测试
    - [ ] 性能指标验证（API响应时间<500ms）
    - [ ] 并发测试（100用户同时访问）
    - [ ] 数据库备份机制验证
    - [ ] 回滚方案准备
  - ⚠️ **安全检查清单：**
    - [ ] SQL注入防护测试
    - [ ] XSS防护测试
    - [ ] CSRF防护测试
    - [ ] 认证和授权测试
    - [ ] 敏感数据加密验证
    - [ ] API频率限制测试
  - ⚠️ **数据完整性检查：**
    - [ ] 所有现有用户数据完整
    - [ ] 所有现有订单数据完整
    - [ ] 所有现有生成历史完整
    - [ ] 价格配置数据正确
  - ⚠️ **文档完整性检查：**
    - [ ] 管理员使用手册完成
    - [ ] API文档完成
    - [ ] 部署文档完成
    - [ ] 应急预案文档完成
  - 🎯 **上线准备就绪标准：**
    - [ ] 所有测试通过率100%
    - [ ] 无严重或高危bug
    - [ ] 性能指标达标
    - [ ] 安全检查通过
    - [ ] 文档齐全
    - [ ] 备份和回滚方案就绪
  - 🚀 准备商业化上线

## Critical Safety Rules

**🔴 项目稳定性保证 - 必须严格遵守**

1. **零破坏原则**
   - 所有新增代码必须在独立目录（`admin/`）中
   - 禁止修改现有小程序端代码（`miniprogram/`）
   - 禁止修改现有H5端代码（`src/`）
   - 禁止修改现有后端路由（除非明确标注为"扩展"）

2. **数据库安全**
   - 所有数据库迁移必须使用事务
   - 新增表不能影响现有表
   - 禁止修改现有表结构
   - 所有迁移必须可回滚

3. **API兼容性**
   - 新增API必须使用独立路径前缀（`/admin-api/`）
   - 现有API（`/api/`）保持不变
   - 价格查询API（`/api/prices/current`）作为新增公共API，不影响现有逻辑

4. **测试要求**
   - 每个功能模块完成后必须运行现有测试套件
   - 确保所有现有测试通过
   - 新增测试不能影响现有测试

5. **部署隔离**
   - 管理后台独立部署
   - 使用独立的构建流程
   - 不影响现有前端构建

6. **回滚机制**
   - 每个Checkpoint必须验证现有功能正常
   - 发现问题立即停止，回滚变更
   - 记录所有变更，便于追溯

## Implementation Strategy

**阶段一：基础设施（任务1-6）**
- 搭建独立的管理后台项目
- 创建新的数据库表
- 实现认证系统
- **验证点：现有功能完全不受影响**

**阶段二：核心功能（任务7-13）**
- 价格配置管理（核心架构优化）
- 用户管理
- 订单管理
- **验证点：现有小程序和H5功能正常，新增价格API可用**

**阶段三：扩展功能（任务14-24）**
- 数据看板
- 模板管理
- 生成历史监控
- 系统配置
- 日志监控
- 数据导出
- **验证点：所有管理功能正常，现有业务不受影响**

**阶段四：集成与优化（任务25-31）**
- 价格配置迁移到各端
- 性能优化
- 安全加固
- 部署准备
- **验证点：完整系统测试，确保商业化上线标准**

## Notes

- 任务标记 `*` 的为可选任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号，确保可追溯性
- 属性测试任务明确标注了属性编号和验证的需求
- **必须按顺序执行任务，确保依赖关系和安全性**
- Checkpoint任务用于阶段性验证，**发现问题必须立即停止**
- 价格配置迁移（任务27）是核心架构优化，必须完成
- 所有测试使用fast-check框架，每个属性测试至少100次迭代
- **每完成一个任务，必须验证现有功能正常运行**
- 使用 `pnpm` 作为包管理器（遵守 DEVELOPMENT_RULES.md）
- 禁止使用 `cat << 'EOF'` 命令（遵守 DEVELOPMENT_RULES.md）
