# Requirements Document

## Introduction

本功能为微信小程序实现基于腾讯云 CloudBase 的完整用户认证和支付系统。

**技术架构概述：**
- **认证方式**：微信小程序 unionId 静默登录（signInWithUnionId）
- **后端服务**：Node.js 后端通过 Docker 部署到腾讯云托管服务
- **后端调用**：小程序通过 `wx.cloud.callContainer` 调用云托管服务（内网通信，无需配置服务器域名）
- **支付能力**：通过 CloudBase 云函数（wxpayFunctions）实现微信支付
- **支付调用**：小程序通过 `wx.cloud.callFunction` 调用支付云函数
- **商品定价**：免费版(0元)、9.9元尝鲜包、29.9元尊享包

**开发规范：**
- 所有开发任务必须遵守 `DEVELOPMENT_RULES.md` 中的规则
- 使用 pnpm 作为包管理器，禁止使用 npm
- 第三方服务通过 Docker 启动
- 禁止使用 `cat << 'EOF'` 命令
- 任务完成后清理无用代码和文件

## Glossary

- **CloudBase**: 腾讯云开发平台，提供云函数、数据库、存储、云托管等后端服务
- **Cloud_Container**: 云托管服务，Docker 容器化部署的后端服务
- **callContainer**: wx.cloud.callContainer，小程序调用云托管服务的 API
- **callFunction**: wx.cloud.callFunction，小程序调用云函数的 API
- **UnionId**: 微信开放平台下同一用户在不同应用中的唯一标识
- **OpenId**: 微信用户在单个小程序中的唯一标识
- **Auth_Module**: 小程序端认证模块，负责处理登录逻辑
- **Login_State**: 登录状态对象，包含用户认证信息
- **Silent_Login**: 静默登录，无需用户手动操作即可完成登录
- **Cloud_Function**: 云函数，运行在云端的服务端代码
- **wxpayFunctions**: 微信支付云函数集合，包含下单、查询、退款等功能
- **wxpayOrderCallback**: 支付回调云函数，接收微信支付异步通知
- **Order**: 订单对象，包含订单号、金额、状态等信息
- **Payment_Modal**: 支付弹窗组件，展示套餐选择和支付流程
- **X-WX-SERVICE**: 云托管服务名称，在 callContainer 的 header 中指定

## Requirements

### Requirement 1: wx.cloud 初始化

**User Story:** As a 开发者, I want to 在小程序启动时初始化 wx.cloud, so that 后续可以使用云托管和云函数服务。

#### Acceptance Criteria

1. WHEN 小程序启动时, THE App SHALL 在 onLaunch 中调用 wx.cloud.init 并配置正确的环境 ID
2. WHEN wx.cloud 初始化成功, THE App SHALL 将初始化状态记录到 globalData
3. IF wx.cloud 初始化失败, THEN THE App SHALL 记录错误日志并提示用户
4. THE App SHALL 配置 traceUser 参数用于用户访问记录

### Requirement 2: 微信 UnionId 静默登录

**User Story:** As a 用户, I want to 打开小程序时自动完成登录, so that 我无需手动操作即可使用小程序功能。

#### Acceptance Criteria

1. WHEN 用户首次打开小程序, THE Auth_Module SHALL 调用 signInWithUnionId 完成静默登录
2. WHEN 静默登录成功, THE Auth_Module SHALL 获取并存储 Login_State 到本地
3. WHEN 静默登录成功且用户不存在, THE CloudBase SHALL 根据登录模式配置自动注册新用户
4. IF 静默登录失败, THEN THE Auth_Module SHALL 记录错误并提示用户重试
5. THE Auth_Module SHALL 在登录成功后触发用户信息同步到云托管后端

### Requirement 3: 登录状态管理

**User Story:** As a 用户, I want to 小程序记住我的登录状态, so that 我不需要每次打开都重新登录。

#### Acceptance Criteria

1. WHEN 用户已登录, THE Auth_Module SHALL 在本地存储登录凭证和过期时间
2. WHEN 小程序启动时, THE Auth_Module SHALL 检查本地登录状态是否有效
3. WHEN 登录状态过期, THE Auth_Module SHALL 自动刷新登录状态
4. IF 刷新登录状态失败, THEN THE Auth_Module SHALL 清除本地凭证并重新执行静默登录
5. THE Auth_Module SHALL 提供 checkLogin 方法供其他模块查询登录状态

### Requirement 4: 云托管后端调用

**User Story:** As a 开发者, I want to 通过 callContainer 调用云托管后端, so that 可以使用内网通信提高安全性和性能。

#### Acceptance Criteria

1. WHEN 需要调用后端 API 时, THE System SHALL 使用 wx.cloud.callContainer 而非 wx.request
2. THE callContainer SHALL 在 header 中设置 X-WX-SERVICE 指定云托管服务名称
3. THE callContainer SHALL 配置正确的 env 参数指向云开发环境 ID
4. WHEN 调用成功, THE System SHALL 正确解析返回的 JSON 数据
5. IF 调用失败, THEN THE System SHALL 根据错误类型进行重试或提示用户

### Requirement 5: 用户信息同步

**User Story:** As a 系统, I want to 将 CloudBase 用户与后端数据库用户关联, so that 可以统一管理用户数据。

#### Acceptance Criteria

1. WHEN 用户登录成功, THE Auth_Module SHALL 获取 CloudBase 用户的 uid 和 openid
2. WHEN 获取到用户标识后, THE Auth_Module SHALL 通过 callContainer 调用后端接口同步用户信息
3. WHEN 用户信息同步成功, THE Auth_Module SHALL 更新本地存储的用户信息
4. IF 用户信息同步失败, THEN THE Auth_Module SHALL 记录错误但不阻断登录流程
5. THE Auth_Module SHALL 支持手动触发用户信息同步

### Requirement 6: 退出登录

**User Story:** As a 用户, I want to 能够退出登录, so that 我可以切换账号或保护隐私。

#### Acceptance Criteria

1. WHEN 用户触发退出登录, THE Auth_Module SHALL 调用 CloudBase auth.signOut 方法
2. WHEN 退出登录成功, THE Auth_Module SHALL 清除所有本地存储的用户信息和凭证
3. WHEN 退出登录成功, THE Auth_Module SHALL 重置全局用户状态
4. IF 退出登录失败, THEN THE Auth_Module SHALL 仍然清除本地数据并记录错误
5. THE Auth_Module SHALL 在退出登录后通知相关页面更新状态

### Requirement 7: 云函数支付下单

**User Story:** As a 用户, I want to 选择套餐后能够完成微信支付, so that 我可以解锁高级功能。

#### Acceptance Criteria

1. WHEN 用户选择付费套餐并点击支付, THE Payment_Modal SHALL 通过 wx.cloud.callFunction 调用 wxpayFunctions 云函数
2. WHEN 调用云函数时, THE Payment_Modal SHALL 传递 type: 'wxpay_order' 及业务参数
3. WHEN 订单创建成功, THE Cloud_Function SHALL 返回微信支付凭证（timeStamp、nonceStr、packageVal、paySign）
4. THE Cloud_Function SHALL 支持三种套餐价格：免费版(0元)、尝鲜包(990分/9.9元)、尊享包(2990分/29.9元)
5. THE Cloud_Function SHALL 在订单中记录用户ID、套餐类型、关联的生成任务ID

### Requirement 8: 微信支付流程

**User Story:** As a 用户, I want to 使用微信支付完成付款, so that 我可以快速安全地完成交易。

#### Acceptance Criteria

1. WHEN 获取到支付凭证后, THE Payment_Modal SHALL 调用 wx.requestPayment 唤起微信支付
2. THE wx.requestPayment SHALL 使用 signType: 'RSA' 固定签名类型
3. WHEN 用户完成支付, THE Payment_Modal SHALL 显示支付成功状态并更新用户套餐
4. IF 用户取消支付, THEN THE Payment_Modal SHALL 恢复到套餐选择状态
5. IF 支付失败, THEN THE Payment_Modal SHALL 显示错误信息并提供重试选项

### Requirement 9: 订单查询

**User Story:** As a 系统, I want to 能够查询订单状态, so that 可以确认支付结果并更新用户权益。

#### Acceptance Criteria

1. WHEN 需要查询订单状态时, THE System SHALL 通过 callFunction 调用 wxpayFunctions，type 为 wxpay_query_order_by_out_trade_no
2. WHEN 查询到订单已支付, THE System SHALL 更新用户的付费状态和权益
3. WHEN 查询到订单未支付, THE System SHALL 保持当前状态不变
4. THE System SHALL 支持通过商户订单号或微信交易号（wxpay_query_order_by_transaction_id）查询订单
5. THE System SHALL 在支付回调和用户主动查询时都能正确处理订单状态

### Requirement 10: 支付回调处理

**User Story:** As a 系统, I want to 接收微信支付的异步通知, so that 可以可靠地确认支付结果并更新订单状态。

#### Acceptance Criteria

1. THE System SHALL 创建 wxpayOrderCallback 云函数接收微信支付通知
2. WHEN 收到支付通知且 event_type 为 TRANSACTION.SUCCESS, THE Cloud_Function SHALL 更新订单状态为已支付
3. WHEN 支付成功确认后, THE Cloud_Function SHALL 通过 callContainer 调用云托管后端更新用户权益
4. THE Cloud_Function SHALL 在云函数参数设置中配置"接收支付通知的云函数"字段为 scf:wxpayOrderCallback
5. THE Cloud_Function SHALL 记录支付回调日志用于对账和问题排查

### Requirement 11: 退款功能

**User Story:** As a 管理员, I want to 能够为用户办理退款, so that 可以处理用户的退款请求。

#### Acceptance Criteria

1. WHEN 管理员发起退款请求, THE System SHALL 通过 callFunction 调用 wxpayFunctions，type 为 wxpay_refund
2. WHEN 退款成功, THE System SHALL 更新订单状态为已退款并回收用户权益
3. IF 退款失败, THEN THE System SHALL 记录错误并通知管理员
4. THE System SHALL 支持全额退款和部分退款
5. THE System SHALL 提供 wxpay_refund_query 查询退款状态

### Requirement 12: 订单数据持久化

**User Story:** As a 系统, I want to 将订单数据存储到数据库, so that 可以追踪和管理所有交易记录。

#### Acceptance Criteria

1. WHEN 创建订单时, THE Cloud_Function SHALL 将订单信息存储到 CloudBase 数据库的 orders 集合
2. THE Order SHALL 包含字段：orderId、outTradeNo、userId、openId、packageType、amount、status、generationId、createdAt、updatedAt
3. WHEN 订单状态变更时, THE System SHALL 更新数据库中的订单记录
4. THE System SHALL 支持按用户ID查询历史订单
5. THE System SHALL 为订单数据建立适当的索引以提高查询性能

### Requirement 13: 云函数业务逻辑适配

**User Story:** As a 开发者, I want to 修改云函数以适配项目业务逻辑, so that 支付流程与现有商品体系对接。

#### Acceptance Criteria

1. THE wxpay_order 云函数 SHALL 接收 packageType 参数并根据套餐类型设置正确的金额
2. THE wxpay_order 云函数 SHALL 接收 generationId 参数关联生成任务
3. THE wxpay_order 云函数 SHALL 生成包含业务信息的商品描述（如"AI全家福-尊享包"）
4. THE wxpay_query_order 云函数 SHALL 接收动态的 out_trade_no 参数而非硬编码
5. THE wxpay_refund 云函数 SHALL 接收动态的 transaction_id 和 amount 参数

### Requirement 14: 错误处理与日志

**User Story:** As a 开发者, I want to 完善的错误处理和日志记录, so that 我可以快速定位和解决认证和支付问题。

#### Acceptance Criteria

1. WHEN 认证或支付过程发生错误, THE System SHALL 根据错误码返回友好的错误提示
2. WHEN 发生网络错误, THE System SHALL 提示用户检查网络并提供重试选项
3. THE System SHALL 记录所有认证和支付相关操作的日志（包括成功和失败）
4. THE System SHALL 支持配置日志级别（debug、info、warn、error）
5. IF 发生严重错误, THEN THE System SHALL 上报错误到后端错误日志服务

### Requirement 15: CloudBase 后端配置

**User Story:** As a 开发者, I want to 正确配置 CloudBase 后端, so that 前端可以正常完成登录和支付流程。

#### Acceptance Criteria

1. THE CloudBase_Console SHALL 配置微信小程序作为身份源并启用 UnionId 登录方式
2. THE CloudBase_Console SHALL 配置登录模式为"自动注册新用户"
3. THE CloudBase_Console SHALL 部署 wxpayFunctions 和 wxpayOrderCallback 云函数
4. THE CloudBase_Console SHALL 部署 Docker 后端服务到云托管并配置服务名称
5. THE CloudBase_Console SHALL 配置微信支付商户信息并在 wxpayOrderCallback 参数中设置"接收支付通知的云函数"
