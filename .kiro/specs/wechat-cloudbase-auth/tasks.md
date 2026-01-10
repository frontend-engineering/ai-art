# Implementation Plan: 微信小程序 CloudBase 用户认证和支付系统

## Overview

本实现计划将微信小程序的用户认证和支付功能迁移到 CloudBase 架构。实现顺序为：先完成认证模块，再完成云托管请求模块，最后完成支付模块和云函数适配。

## Tasks

- [x] 1. 创建 CloudBase 认证模块
  - [x] 1.1 创建 cloudbase-auth.js 文件，实现 initCloudBase 函数
    - 初始化 wx.cloud，配置环境 ID
    - 将初始化状态记录到 globalData
    - 处理初始化失败的情况
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 实现 signInWithUnionId 静默登录函数
    - 调用 CloudBase auth.signInWithUnionId()
    - 获取 LoginState 并存储到本地
    - 处理登录失败的情况
    - _Requirements: 2.1, 2.2, 2.4_
  - [x] 1.3 实现登录状态管理函数
    - 实现 checkLoginState 检查登录状态
    - 实现 refreshLoginState 刷新登录状态
    - 实现 getCurrentUser 获取当前用户
    - 处理状态过期和刷新失败的情况
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 1.4 实现 signOut 退出登录函数
    - 调用 CloudBase auth.signOut()
    - 清除本地存储的用户信息和凭证
    - 重置全局用户状态
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 1.5 编写认证模块属性测试
    - **Property 1: 登录状态存储 Round-Trip**
    - **Property 2: 登录状态有效性检查**
    - **Property 3: 退出登录状态清除**
    - **Validates: Requirements 2.2, 3.1, 3.2, 6.2, 6.3**

- [x] 2. 更新 app.js 集成 CloudBase 认证
  - [x] 2.1 修改 app.js 的 onLaunch 方法
    - 调用 initCloudBase 初始化
    - 调用 signInWithUnionId 完成静默登录
    - 登录成功后触发用户信息同步
    - _Requirements: 1.1, 2.1, 2.5_
  - [x] 2.2 更新全局状态管理
    - 更新 globalData 结构支持 CloudBase 用户信息
    - 实现 ensureLogin 方法
    - _Requirements: 3.5_

- [x] 3. Checkpoint - 认证模块完成
  - 确保认证模块所有测试通过
  - 在微信开发者工具中测试登录流程
  - 如有问题请询问用户

- [x] 4. 创建云托管请求模块
  - [x] 4.1 更新 cloudbase-request.js 实现 callContainer 函数
    - 使用 wx.cloud.callContainer 替代 wx.request
    - 在 header 中设置 X-WX-SERVICE
    - 配置正确的 env 参数
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 实现请求响应处理
    - 正确解析 JSON 响应
    - 实现错误类型判断和处理
    - 实现重试逻辑
    - _Requirements: 4.4, 4.5_
  - [x] 4.3 实现用户信息同步功能
    - 登录成功后调用后端同步接口
    - 更新本地存储的用户信息
    - 处理同步失败的情况
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 4.4 编写云托管请求模块属性测试
    - **Property 4: callContainer 请求头构造**
    - **Property 5: JSON 响应解析**
    - **Property 6: 错误类型处理**
    - **Property 7: 用户信息同步后本地更新**
    - **Validates: Requirements 4.2, 4.4, 4.5, 5.3**

- [x] 5. Checkpoint - 云托管请求模块完成
  - 确保云托管请求模块所有测试通过
  - 测试与云托管后端的连通性
  - 如有问题请询问用户

- [x] 6. 创建支付模块
  - [x] 6.1 创建 cloudbase-payment.js 文件
    - 定义套餐配置（free/basic/premium）
    - 实现 createOrder 函数调用 wxpay_order 云函数
    - 正确传递 type 和业务参数
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  - [x] 6.2 实现 requestPayment 函数
    - 调用 wx.requestPayment 唤起支付
    - 设置 signType 为 'RSA'
    - 处理支付成功、取消、失败的情况
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 6.3 实现 queryOrder 函数
    - 调用 wxpay_query_order_by_out_trade_no 云函数
    - 支持通过商户订单号或微信交易号查询
    - 根据订单状态更新用户权益
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 6.4 实现 refund 函数
    - 调用 wxpay_refund 云函数
    - 支持全额退款和部分退款
    - 更新订单状态和用户权益
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [ ]* 6.5 编写支付模块属性测试
    - **Property 8: 云函数调用参数构造**
    - **Property 9: 套餐金额映射**
    - **Property 11: 订单状态机**
    - **Property 13: 退款金额验证**
    - **Validates: Requirements 7.2, 7.4, 9.2, 9.3, 11.4**

- [x] 7. 更新支付弹窗组件
  - [x] 7.1 修改 payment-modal.js 使用新支付模块
    - 导入 cloudbase-payment 模块
    - 替换原有的 paymentAPI 调用
    - 使用 wx.cloud.callFunction 调用云函数
    - _Requirements: 7.1, 12.1_
  - [x] 7.2 更新支付流程处理
    - 处理云函数返回的支付凭证
    - 正确调用 wx.requestPayment
    - 更新支付状态显示
    - _Requirements: 8.1, 8.2_

- [x] 8. Checkpoint - 支付模块完成
  - 确保支付模块所有测试通过
  - 在微信开发者工具中测试支付流程（使用 0.01 元测试）
  - 如有问题请询问用户

- [x] 9. 适配支付云函数
  - [x] 9.1 修改 wxpay_order 云函数
    - 接收 packageType 参数并映射金额
    - 接收 generationId 参数关联生成任务
    - 生成包含业务信息的商品描述
    - 将订单信息存储到 CloudBase 数据库
    - _Requirements: 13.1, 13.2, 13.3, 12.1, 12.2_
  - [x] 9.2 修改 wxpay_query_order 云函数
    - 接收动态的 out_trade_no 参数
    - 支持通过 transaction_id 查询
    - _Requirements: 13.4, 9.4_
  - [x] 9.3 修改 wxpay_refund 云函数
    - 接收动态的 transaction_id 和 amount 参数
    - 支持全额退款和部分退款
    - _Requirements: 13.5, 11.4_
  - [ ]* 9.4 编写云函数属性测试
    - **Property 10: 订单数据完整性**
    - **Property 14: 商品描述格式**
    - **Validates: Requirements 7.5, 12.2, 13.3**

- [x] 10. 创建支付回调云函数
  - [x] 10.1 创建 wxpayOrderCallback 云函数
    - 接收微信支付通知
    - 判断 event_type 是否为 TRANSACTION.SUCCESS
    - 更新订单状态为已支付
    - _Requirements: 10.1, 10.2_
  - [x] 10.2 实现用户权益更新
    - 调用云托管后端更新用户付费状态
    - 记录支付回调日志
    - _Requirements: 10.3, 10.5_
  - [ ]* 10.3 编写支付回调属性测试
    - **Property 12: 支付回调处理**
    - **Validates: Requirements 10.2**

- [x] 11. 实现错误处理模块
  - [x] 11.1 创建错误码定义文件
    - 定义网络错误、认证错误、支付错误、业务错误、系统错误
    - 实现错误码到友好提示的映射
    - _Requirements: 14.1_
  - [x] 11.2 实现错误处理和日志记录
    - 实现日志级别配置
    - 实现错误上报到后端服务
    - _Requirements: 14.2, 14.3, 14.4, 14.5_
  - [ ]* 11.3 编写错误处理属性测试
    - **Property 6: 错误类型处理**
    - **Validates: Requirements 4.5, 14.1**

- [x] 12. Checkpoint - 云函数和错误处理完成
  - 确保所有云函数测试通过
  - 部署云函数到 CloudBase
  - 配置 wxpayOrderCallback 接收支付通知
  - 如有问题请询问用户

- [x] 13. 集成测试和清理
  - [x] 13.1 完整流程集成测试
    - 测试登录 -> 选择套餐 -> 支付 -> 权益更新完整流程
    - 测试支付取消和失败的处理
    - 测试退款流程
    - _Requirements: 全部_
  - [x] 13.2 代码清理
    - 删除临时文件和备份文件
    - 删除冗余的脚本和配置
    - 确保项目结构清晰简洁
    - _遵守 DEVELOPMENT_RULES.md_

- [x] 14. Final Checkpoint - 功能完成
  - 确保所有测试通过
  - 确保代码符合开发规范
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选测试任务，可以跳过以加快 MVP 开发
- 每个 Checkpoint 都需要确认当前阶段功能正常后再继续
- 所有开发任务必须遵守 `DEVELOPMENT_RULES.md` 中的规则
- 使用 pnpm 作为包管理器，禁止使用 npm
- 禁止使用 `cat << 'EOF'` 命令
- 任务完成后清理无用代码和文件
