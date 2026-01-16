# Requirements Document - 管理后台系统

## Introduction

本文档定义了AI全家福项目的管理后台系统需求。该系统旨在为运营人员提供一个统一的管理平台，用于监控和管理用户、订单、支付、配置等核心业务数据，实现产品的高效运营和数据驱动决策。

## Glossary

- **Admin_System**: 管理后台系统，提供Web界面供运营人员使用
- **User**: 使用AI全家福小程序的终端用户
- **Admin_User**: 管理后台的管理员用户
- **Payment_Order**: 数字产品支付订单（尝鲜包、尊享包）
- **Product_Order**: 实体产品订单（晶瓷画、卷轴）
- **Generation_Record**: AI图片生成历史记录
- **Price_Config**: 价格配置表，统一管理所有产品和服务的价格
- **Template**: AI生成使用的模板配置
- **Dashboard**: 数据看板，展示关键业务指标
- **API_Key**: 用于第三方服务调用的认证密钥
- **OSS**: 对象存储服务，用于存储图片和文件

## Requirements

### Requirement 1: 管理员认证与权限管理

**User Story:** 作为系统管理员，我希望有安全的登录机制和权限控制，以便保护敏感数据和操作。

#### Acceptance Criteria

1. WHEN 管理员访问后台首页 THEN THE Admin_System SHALL 重定向到登录页面（如果未登录）
2. WHEN 管理员输入正确的用户名和密码 THEN THE Admin_System SHALL 验证凭据并创建会话
3. WHEN 管理员输入错误的凭据超过5次 THEN THE Admin_System SHALL 锁定账户15分钟
4. WHEN 管理员会话超过2小时无操作 THEN THE Admin_System SHALL 自动登出
5. WHERE 管理员具有不同角色（超级管理员、运营、客服） THE Admin_System SHALL 根据角色限制可访问的功能模块

### Requirement 2: 用户管理

**User Story:** 作为运营人员，我希望查看和管理所有用户信息，以便了解用户行为和提供支持。

#### Acceptance Criteria

1. WHEN 运营人员访问用户列表页 THEN THE Admin_System SHALL 展示所有用户的基本信息（ID、昵称、付费状态、注册时间）
2. WHEN 运营人员搜索用户 THEN THE Admin_System SHALL 支持按昵称、OpenID、付费状态进行筛选
3. WHEN 运营人员点击用户详情 THEN THE Admin_System SHALL 展示用户的完整信息、生成历史、订单记录
4. WHEN 运营人员修改用户付费状态 THEN THE Admin_System SHALL 更新数据库并记录操作日志
5. WHEN 运营人员导出用户数据 THEN THE Admin_System SHALL 生成Excel文件包含所有筛选后的用户信息

### Requirement 3: 订单管理

**User Story:** 作为运营人员，我希望统一管理所有订单（数字产品和实体产品），以便跟踪收入和处理订单问题。

#### Acceptance Criteria

1. WHEN 运营人员访问订单列表页 THEN THE Admin_System SHALL 展示所有订单（支付订单和产品订单）
2. WHEN 运营人员筛选订单 THEN THE Admin_System SHALL 支持按订单类型、状态、时间范围、用户ID进行筛选
3. WHEN 运营人员查看订单详情 THEN THE Admin_System SHALL 展示订单的完整信息、关联用户、支付信息
4. WHEN 运营人员处理实体产品订单 THEN THE Admin_System SHALL 允许更新订单状态（已导出、已发货、已送达）
5. WHEN 运营人员导出订单数据 THEN THE Admin_System SHALL 生成Excel文件用于对账和分析
6. WHEN 运营人员处理退款 THEN THE Admin_System SHALL 调用微信支付退款接口并更新订单状态

### Requirement 4: 支付与账单统计

**User Story:** 作为财务人员，我希望查看详细的支付和账单数据，以便进行财务对账和分析。

#### Acceptance Criteria

1. WHEN 财务人员访问账单统计页 THEN THE Admin_System SHALL 展示总收入、订单数、转化率等关键指标
2. WHEN 财务人员选择时间范围 THEN THE Admin_System SHALL 展示该时间段的收入趋势图表
3. WHEN 财务人员查看支付明细 THEN THE Admin_System SHALL 展示每笔支付的详细信息（订单号、金额、支付时间、微信交易ID）
4. WHEN 财务人员导出账单 THEN THE Admin_System SHALL 生成符合财务要求的Excel报表
5. WHEN 财务人员查看套餐销售分布 THEN THE Admin_System SHALL 展示各套餐（免费、尝鲜包、尊享包）的销售占比

### Requirement 5: 价格配置管理

**User Story:** 作为产品经理，我希望在后台统一管理所有价格配置，以便灵活调整定价策略而无需修改代码。

#### Acceptance Criteria

1. WHEN 产品经理访问价格配置页 THEN THE Admin_System SHALL 展示所有产品和服务的价格配置
2. WHEN 产品经理修改套餐价格 THEN THE Admin_System SHALL 更新Price_Config表并立即生效
3. WHEN 产品经理修改实体产品价格 THEN THE Admin_System SHALL 更新配置并记录价格变更历史
4. WHEN 小程序或后端服务查询价格 THEN THE Admin_System SHALL 提供API接口返回最新价格配置
5. WHERE 价格配置包含生效时间 THE Admin_System SHALL 支持定时生效的价格策略

### Requirement 6: 模板管理

**User Story:** 作为运营人员，我希望管理AI生成使用的模板，以便快速上线新模板和下架旧模板。

#### Acceptance Criteria

1. WHEN 运营人员访问模板管理页 THEN THE Admin_System SHALL 展示所有模板（变换模式、拼图模式）
2. WHEN 运营人员上传新模板 THEN THE Admin_System SHALL 上传图片到OSS并创建模板记录
3. WHEN 运营人员编辑模板信息 THEN THE Admin_System SHALL 更新模板名称、描述、排序、状态
4. WHEN 运营人员下架模板 THEN THE Admin_System SHALL 将模板状态设为不可用，前端不再展示
5. WHEN 运营人员查看模板使用统计 THEN THE Admin_System SHALL 展示每个模板的使用次数和受欢迎程度

### Requirement 7: 生成历史监控

**User Story:** 作为运营人员，我希望监控所有AI生成任务，以便及时发现和处理失败任务。

#### Acceptance Criteria

1. WHEN 运营人员访问生成历史页 THEN THE Admin_System SHALL 展示所有生成记录及其状态
2. WHEN 运营人员筛选失败任务 THEN THE Admin_System SHALL 展示所有状态为failed的记录
3. WHEN 运营人员查看生成详情 THEN THE Admin_System SHALL 展示原始图片、模板、生成结果、任务ID
4. WHEN 运营人员重试失败任务 THEN THE Admin_System SHALL 调用后端API重新提交生成任务
5. WHEN 运营人员查看生成统计 THEN THE Admin_System SHALL 展示成功率、平均生成时间等指标

### Requirement 8: 数据看板

**User Story:** 作为管理者，我希望在首页看到关键业务指标的实时数据，以便快速了解业务状况。

#### Acceptance Criteria

1. WHEN 管理者登录后台 THEN THE Admin_System SHALL 在首页展示核心指标（今日新增用户、今日收入、今日订单数）
2. WHEN 管理者查看趋势图表 THEN THE Admin_System SHALL 展示近7天和近30天的用户增长、收入趋势
3. WHEN 管理者查看实时数据 THEN THE Admin_System SHALL 每30秒自动刷新关键指标
4. WHEN 管理者查看用户分布 THEN THE Admin_System SHALL 展示付费用户与免费用户的占比
5. WHEN 管理者查看热门模板 THEN THE Admin_System SHALL 展示使用次数最多的前10个模板

### Requirement 9: 系统配置管理

**User Story:** 作为系统管理员，我希望管理系统级配置，以便控制系统行为和第三方服务集成。

#### Acceptance Criteria

1. WHEN 管理员访问系统配置页 THEN THE Admin_System SHALL 展示所有可配置项（OSS配置、支付配置、API配置）
2. WHEN 管理员修改OSS配置 THEN THE Admin_System SHALL 验证配置有效性并更新
3. WHEN 管理员修改支付配置 THEN THE Admin_System SHALL 更新微信支付相关参数
4. WHEN 管理员查看API密钥 THEN THE Admin_System SHALL 展示所有API密钥及其使用情况
5. WHEN 管理员生成新API密钥 THEN THE Admin_System SHALL 创建密钥并返回给管理员（仅显示一次）

### Requirement 10: 操作日志与审计

**User Story:** 作为安全审计员，我希望查看所有管理员操作日志，以便追踪系统变更和排查问题。

#### Acceptance Criteria

1. WHEN 管理员执行任何修改操作 THEN THE Admin_System SHALL 记录操作日志（操作人、操作时间、操作内容、IP地址）
2. WHEN 审计员访问操作日志页 THEN THE Admin_System SHALL 展示所有操作记录
3. WHEN 审计员筛选日志 THEN THE Admin_System SHALL 支持按操作人、操作类型、时间范围筛选
4. WHEN 审计员导出日志 THEN THE Admin_System SHALL 生成日志文件用于归档
5. WHEN 系统发生敏感操作（删除数据、修改价格） THEN THE Admin_System SHALL 发送通知给超级管理员

### Requirement 11: 错误日志监控

**User Story:** 作为技术支持人员，我希望查看系统错误日志，以便快速定位和解决问题。

#### Acceptance Criteria

1. WHEN 技术人员访问错误日志页 THEN THE Admin_System SHALL 展示所有系统错误记录
2. WHEN 技术人员筛选错误 THEN THE Admin_System SHALL 支持按错误类型、时间、严重程度筛选
3. WHEN 技术人员查看错误详情 THEN THE Admin_System SHALL 展示完整的错误堆栈和上下文信息
4. WHEN 系统发生严重错误 THEN THE Admin_System SHALL 发送告警通知给技术团队
5. WHEN 技术人员标记错误已处理 THEN THE Admin_System SHALL 更新错误状态并记录处理说明

### Requirement 12: 数据导出与报表

**User Story:** 作为数据分析师，我希望导出各类数据报表，以便进行深度分析和决策支持。

#### Acceptance Criteria

1. WHEN 分析师选择导出用户数据 THEN THE Admin_System SHALL 生成包含所有用户字段的Excel文件
2. WHEN 分析师选择导出订单数据 THEN THE Admin_System SHALL 生成包含订单详情和用户信息的Excel文件
3. WHEN 分析师选择导出生成历史 THEN THE Admin_System SHALL 生成包含生成记录和统计信息的Excel文件
4. WHEN 分析师选择自定义报表 THEN THE Admin_System SHALL 允许选择字段和筛选条件生成定制报表
5. WHEN 导出数据量超过10000条 THEN THE Admin_System SHALL 使用异步任务处理并通过邮件发送下载链接
