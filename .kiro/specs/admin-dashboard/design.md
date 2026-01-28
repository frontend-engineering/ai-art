# Design Document - 管理后台系统

## Overview

管理后台系统是AI全家福项目的运营管理平台，采用前后端分离架构。前端使用React + TypeScript + Ant Design构建现代化的管理界面，后端复用现有Express服务并扩展管理API。系统实现统一的价格配置管理，所有价格数据存储在数据库中，通过API提供给小程序端、H5端和云函数使用。

### 技术栈选型

**前端技术栈：**
- React 18 + TypeScript - 类型安全的组件开发
- Ant Design 5 - 企业级UI组件库
- React Router 6 - 路由管理
- Axios - HTTP客户端
- ECharts - 数据可视化
- Vite - 构建工具

**后端技术栈：**
- Express.js - 复用现有后端服务
- MySQL - 数据库（复用现有数据库）
- JWT - 身份认证
- Node-cron - 定时任务

### 部署架构

管理后台独立部署在 `admin/` 目录，与现有项目结构保持隔离：
- 前端构建产物部署到 `admin/dist/`
- 后端管理API集成到现有 `backend/routes/` 中
- 使用独立的端口（3001）或路径前缀（/admin-api）

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      管理后台前端                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 登录页面  │  │ 数据看板  │  │ 用户管理  │  │ 订单管理  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 价格配置  │  │ 模板管理  │  │ 系统配置  │  │ 日志监控  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      后端API服务                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              管理API路由 (/admin-api)                  │   │
│  │  - 认证中间件 (JWT验证)                                │   │
│  │  - 权限中间件 (角色检查)                                │   │
│  │  - 操作日志中间件                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 用户服务  │  │ 订单服务  │  │ 配置服务  │  │ 统计服务  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      MySQL数据库                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  users   │  │  orders  │  │  configs │  │   logs   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                │
│  │  prices  │  │ templates│  ← 新增价格配置表                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
admin/                          # 管理后台根目录
├── src/
│   ├── pages/                  # 页面组件
│   │   ├── Login/             # 登录页
│   │   ├── Dashboard/         # 数据看板
│   │   ├── Users/             # 用户管理
│   │   ├── Orders/            # 订单管理
│   │   ├── Prices/            # 价格配置
│   │   ├── Templates/         # 模板管理
│   │   ├── Config/            # 系统配置
│   │   └── Logs/              # 日志监控
│   ├── components/            # 通用组件
│   ├── services/              # API服务
│   ├── hooks/                 # 自定义Hooks
│   ├── utils/                 # 工具函数
│   ├── types/                 # TypeScript类型定义
│   └── App.tsx                # 应用入口
├── package.json
└── vite.config.ts

backend/
├── routes/
│   └── adminRoutes.js         # 管理后台API路由
├── services/
│   ├── adminAuthService.js    # 管理员认证服务
│   └── priceConfigService.js  # 价格配置服务
└── middleware/
    ├── adminAuth.js           # 管理员认证中间件
    └── adminLogger.js         # 操作日志中间件
```


## Components and Interfaces

### 前端组件架构

#### 1. 布局组件

**AdminLayout**
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
}

// 功能：提供统一的管理后台布局
// - 顶部导航栏（Logo、用户信息、退出登录）
// - 左侧菜单栏（功能模块导航）
// - 主内容区域
```

**Sidebar**
```typescript
interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: MenuItem[];
}

// 功能：左侧导航菜单
// - 支持多级菜单
// - 高亮当前选中项
// - 折叠/展开功能
```

#### 2. 页面组件

**Dashboard**
```typescript
interface DashboardData {
  todayUsers: number;
  todayRevenue: number;
  todayOrders: number;
  userTrend: ChartData[];
  revenueTrend: ChartData[];
  packageDistribution: PieChartData[];
}

// 功能：数据看板
// - 展示关键业务指标
// - 趋势图表
// - 实时数据刷新
```

**UserManagement**
```typescript
interface User {
  id: string;
  nickname: string;
  wechat_openid: string;
  payment_status: 'free' | 'basic' | 'premium';
  created_at: string;
}

interface UserListProps {
  filters: UserFilters;
  onFilterChange: (filters: UserFilters) => void;
}

// 功能：用户管理
// - 用户列表展示
// - 搜索和筛选
// - 用户详情查看
// - 付费状态修改
// - 数据导出
```

**OrderManagement**
```typescript
interface Order {
  id: string;
  user_id: string;
  type: 'payment' | 'product';
  amount: number;
  status: string;
  created_at: string;
}

// 功能：订单管理
// - 订单列表（支付订单+产品订单）
// - 订单筛选和搜索
// - 订单详情查看
// - 订单状态更新
// - 退款处理
// - 数据导出
```

**PriceConfig**
```typescript
interface PriceConfigItem {
  id: string;
  category: 'package' | 'product' | 'service';
  name: string;
  price: number;
  description: string;
  effective_date: string;
  status: 'active' | 'inactive';
}

// 功能：价格配置管理（核心功能）
// - 价格列表展示
// - 新增/编辑价格配置
// - 价格历史记录
// - 定时生效设置
```

#### 3. 通用组件

**DataTable**
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading: boolean;
  pagination: PaginationConfig;
  onPageChange: (page: number, pageSize: number) => void;
}

// 功能：通用数据表格
// - 支持排序、筛选
// - 分页
// - 加载状态
// - 操作列
```

**ExportButton**
```typescript
interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: ExportColumn[];
}

// 功能：数据导出按钮
// - 导出为Excel
// - 自定义导出字段
// - 大数据量异步导出
```

### 后端API接口

#### 1. 认证接口

**POST /admin-api/auth/login**
```typescript
Request: {
  username: string;
  password: string;
}

Response: {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      role: 'super_admin' | 'operator' | 'support';
    }
  }
}
```

**POST /admin-api/auth/logout**
```typescript
Request: {
  token: string;
}

Response: {
  success: boolean;
}
```

#### 2. 用户管理接口

**GET /admin-api/users**
```typescript
Query: {
  page: number;
  pageSize: number;
  search?: string;
  paymentStatus?: 'free' | 'basic' | 'premium';
  startDate?: string;
  endDate?: string;
}

Response: {
  success: boolean;
  data: {
    users: User[];
    total: number;
    page: number;
    pageSize: number;
  }
}
```

**GET /admin-api/users/:userId**
```typescript
Response: {
  success: boolean;
  data: {
    user: User;
    orders: Order[];
    generations: Generation[];
  }
}
```

**PUT /admin-api/users/:userId/payment-status**
```typescript
Request: {
  paymentStatus: 'free' | 'basic' | 'premium';
}

Response: {
  success: boolean;
  data: User;
}
```

#### 3. 订单管理接口

**GET /admin-api/orders**
```typescript
Query: {
  page: number;
  pageSize: number;
  type?: 'payment' | 'product';
  status?: string;
  startDate?: string;
  endDate?: string;
}

Response: {
  success: boolean;
  data: {
    orders: Order[];
    total: number;
  }
}
```

**PUT /admin-api/orders/:orderId/status**
```typescript
Request: {
  status: string;
}

Response: {
  success: boolean;
  data: Order;
}
```

**POST /admin-api/orders/:orderId/refund**
```typescript
Request: {
  reason: string;
  amount?: number;
}

Response: {
  success: boolean;
  data: {
    refundId: string;
    status: string;
  }
}
```

#### 4. 价格配置接口（核心）

**GET /admin-api/prices**
```typescript
Query: {
  category?: 'package' | 'product' | 'service';
  status?: 'active' | 'inactive';
}

Response: {
  success: boolean;
  data: PriceConfigItem[];
}
```

**POST /admin-api/prices**
```typescript
Request: {
  category: 'package' | 'product' | 'service';
  name: string;
  price: number;
  description: string;
  effectiveDate?: string;
}

Response: {
  success: boolean;
  data: PriceConfigItem;
}
```

**PUT /admin-api/prices/:priceId**
```typescript
Request: {
  price?: number;
  description?: string;
  effectiveDate?: string;
  status?: 'active' | 'inactive';
}

Response: {
  success: boolean;
  data: PriceConfigItem;
}
```

**GET /admin-api/prices/history/:priceId**
```typescript
Response: {
  success: boolean;
  data: {
    history: PriceHistory[];
  }
}
```

#### 5. 公共价格查询接口（供小程序/H5/云函数使用）

**GET /api/prices/current**
```typescript
Query: {
  category?: string;
}

Response: {
  success: boolean;
  data: {
    packages: {
      free: 0,
      basic: number,
      premium: number
    },
    products: {
      crystal: number,
      scroll: number
    }
  }
}
```

#### 6. 统计接口

**GET /admin-api/stats/dashboard**
```typescript
Response: {
  success: boolean;
  data: {
    todayUsers: number;
    todayRevenue: number;
    todayOrders: number;
    userTrend: ChartData[];
    revenueTrend: ChartData[];
  }
}
```

**GET /admin-api/stats/revenue**
```typescript
Query: {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month';
}

Response: {
  success: boolean;
  data: {
    total: number;
    trend: ChartData[];
    byPackage: Record<string, number>;
  }
}
```


## Data Models

### 数据库表设计

#### 1. 管理员用户表 (admin_users)

```sql
CREATE TABLE admin_users (
  id VARCHAR(36) PRIMARY KEY COMMENT '管理员ID',
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  role ENUM('super_admin', 'operator', 'support') DEFAULT 'operator' COMMENT '角色',
  email VARCHAR(100) COMMENT '邮箱',
  status ENUM('active', 'locked', 'disabled') DEFAULT 'active' COMMENT '状态',
  last_login_at TIMESTAMP COMMENT '最后登录时间',
  login_attempts INT DEFAULT 0 COMMENT '登录尝试次数',
  locked_until TIMESTAMP COMMENT '锁定截止时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员用户表';
```

#### 2. 价格配置表 (price_configs)

```sql
CREATE TABLE price_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  category ENUM('package', 'product', 'service') NOT NULL COMMENT '类别',
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '价格代码（如：basic_package, crystal_product）',
  name VARCHAR(100) NOT NULL COMMENT '名称',
  price DECIMAL(10, 2) NOT NULL COMMENT '价格',
  description TEXT COMMENT '描述',
  effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '生效时间',
  status ENUM('active', 'inactive', 'scheduled') DEFAULT 'active' COMMENT '状态',
  created_by VARCHAR(36) COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_effective_date (effective_date),
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='价格配置表';
```

#### 3. 价格历史表 (price_history)

```sql
CREATE TABLE price_history (
  id VARCHAR(36) PRIMARY KEY COMMENT '历史记录ID',
  price_config_id VARCHAR(36) NOT NULL COMMENT '价格配置ID',
  old_price DECIMAL(10, 2) COMMENT '旧价格',
  new_price DECIMAL(10, 2) NOT NULL COMMENT '新价格',
  changed_by VARCHAR(36) NOT NULL COMMENT '修改人',
  change_reason TEXT COMMENT '修改原因',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
  INDEX idx_price_config_id (price_config_id),
  INDEX idx_changed_at (changed_at),
  FOREIGN KEY (price_config_id) REFERENCES price_configs(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='价格历史表';
```

#### 4. 操作日志表 (admin_operation_logs)

```sql
CREATE TABLE admin_operation_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  admin_user_id VARCHAR(36) NOT NULL COMMENT '管理员ID',
  operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
  operation_module VARCHAR(50) NOT NULL COMMENT '操作模块',
  operation_desc TEXT COMMENT '操作描述',
  request_method VARCHAR(10) COMMENT '请求方法',
  request_url VARCHAR(255) COMMENT '请求URL',
  request_params JSON COMMENT '请求参数',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent TEXT COMMENT 'User Agent',
  status ENUM('success', 'failed') DEFAULT 'success' COMMENT '状态',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_operation_module (operation_module),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```

#### 5. 系统配置表 (system_configs)

```sql
CREATE TABLE system_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT NOT NULL COMMENT '配置值',
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
  category VARCHAR(50) COMMENT '配置分类（oss, payment, api）',
  description TEXT COMMENT '配置描述',
  is_sensitive BOOLEAN DEFAULT FALSE COMMENT '是否敏感信息',
  updated_by VARCHAR(36) COMMENT '更新人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key),
  INDEX idx_category (category),
  FOREIGN KEY (updated_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';
```

#### 6. 模板配置表 (template_configs)

```sql
CREATE TABLE template_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '模板ID',
  mode VARCHAR(20) NOT NULL COMMENT '模式（transform, puzzle）',
  name VARCHAR(100) NOT NULL COMMENT '模板名称',
  description TEXT COMMENT '模板描述',
  image_url TEXT NOT NULL COMMENT '模板图片URL',
  thumbnail_url TEXT COMMENT '缩略图URL',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  created_by VARCHAR(36) COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mode (mode),
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order),
  INDEX idx_usage_count (usage_count),
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模板配置表';
```

### TypeScript类型定义

```typescript
// 管理员用户
interface AdminUser {
  id: string;
  username: string;
  role: 'super_admin' | 'operator' | 'support';
  email?: string;
  status: 'active' | 'locked' | 'disabled';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 价格配置
interface PriceConfig {
  id: string;
  category: 'package' | 'product' | 'service';
  code: string;
  name: string;
  price: number;
  description?: string;
  effectiveDate: string;
  status: 'active' | 'inactive' | 'scheduled';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 价格历史
interface PriceHistory {
  id: string;
  priceConfigId: string;
  oldPrice?: number;
  newPrice: number;
  changedBy: string;
  changeReason?: string;
  changedAt: string;
}

// 操作日志
interface OperationLog {
  id: string;
  adminUserId: string;
  operationType: string;
  operationModule: string;
  operationDesc?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestParams?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

// 系统配置
interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: 'string' | 'number' | 'boolean' | 'json';
  category?: string;
  description?: string;
  isSensitive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 模板配置
interface TemplateConfig {
  id: string;
  mode: 'transform' | 'puzzle';
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  usageCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 统计数据
interface DashboardStats {
  todayUsers: number;
  todayRevenue: number;
  todayOrders: number;
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  userGrowthRate: number;
  revenueGrowthRate: number;
}

// 图表数据
interface ChartData {
  date: string;
  value: number;
  label?: string;
}

interface PieChartData {
  name: string;
  value: number;
  percentage: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication and Authorization Properties

**Property 1: Unauthenticated Access Redirection**
*For any* unauthenticated request to protected routes, the system should redirect to the login page.
**Validates: Requirements 1.1**

**Property 2: Valid Credentials Authentication**
*For any* valid username and password combination, the system should successfully create a session and return a JWT token.
**Validates: Requirements 1.2**

**Property 3: Role-Based Access Control**
*For any* admin user with a specific role, the system should only allow access to功能模块 permitted for that role.
**Validates: Requirements 1.5**

### User Management Properties

**Property 4: User List Completeness**
*For any* user list query, the returned data should include all required fields (ID, nickname, payment status, registration time) for each user.
**Validates: Requirements 2.1**

**Property 5: User Search Filtering**
*For any* search query with filters (nickname, OpenID, payment status), all returned users should match the specified filter criteria.
**Validates: Requirements 2.2**

**Property 6: User Detail Completeness**
*For any* user detail request, the returned data should include complete user information, generation history, and order records.
**Validates: Requirements 2.3**

**Property 7: User Status Update with Logging**
*For any* user payment status update, the system should update the database and create an operation log entry.
**Validates: Requirements 2.4**

**Property 8: User Data Export Completeness**
*For any* user data export request, the generated Excel file should contain all filtered user information with all required fields.
**Validates: Requirements 2.5**

### Order Management Properties

**Property 9: Order List Completeness**
*For any* order list query, the system should return all orders (both payment and product orders) with complete information.
**Validates: Requirements 3.1**

**Property 10: Order Filtering Accuracy**
*For any* order filter criteria (type, status, date range, user ID), all returned orders should match the specified criteria.
**Validates: Requirements 3.2**

**Property 11: Order Detail Completeness**
*For any* order detail request, the returned data should include complete order information, associated user data, and payment information.
**Validates: Requirements 3.3**

**Property 12: Order Status Transition Validity**
*For any* order status update, the new status should be a valid transition from the current status according to business rules.
**Validates: Requirements 3.4**

**Property 13: Order Export Completeness**
*For any* order export request, the generated Excel file should contain all filtered orders with complete information for reconciliation.
**Validates: Requirements 3.5**

**Property 14: Refund Processing Integrity**
*For any* refund request, the system should call the WeChat Pay refund API and update the order status atomically.
**Validates: Requirements 3.6**

### Financial Statistics Properties

**Property 15: Dashboard Metrics Accuracy**
*For any* dashboard statistics query, the calculated metrics (total revenue, order count, conversion rate) should accurately reflect the underlying data.
**Validates: Requirements 4.1**

**Property 16: Time Range Filtering**
*For any* selected time range, the returned revenue trend data should only include transactions within that range.
**Validates: Requirements 4.2**

**Property 17: Payment Detail Completeness**
*For any* payment detail query, each payment record should include all required fields (order ID, amount, payment time, transaction ID).
**Validates: Requirements 4.3**

**Property 18: Financial Report Format**
*For any* financial report export, the generated Excel file should conform to financial reporting requirements.
**Validates: Requirements 4.4**

**Property 19: Package Distribution Sum**
*For any* package sales distribution query, the sum of all package percentages should equal 100%.
**Validates: Requirements 4.5**

### Price Configuration Properties

**Property 20: Price Config List Completeness**
*For any* price configuration query, the system should return all product and service price configurations.
**Validates: Requirements 5.1**

**Property 21: Price Update Immediate Effect**
*For any* package price update, the new price should be immediately effective and returned by subsequent price queries.
**Validates: Requirements 5.2**

**Property 22: Price History Recording**
*For any* price modification, the system should create a price history record with old price, new price, and change metadata.
**Validates: Requirements 5.3**

**Property 23: Price Query API Currency**
*For any* price query from miniprogram/H5/cloud functions, the API should return the currently effective price configuration.
**Validates: Requirements 5.4**

**Property 24: Scheduled Price Activation**
*For any* price configuration with an effective date, the price should become active at the specified time.
**Validates: Requirements 5.5**

### Template Management Properties

**Property 25: Template List Completeness**
*For any* template management query, the system should return all templates for both transform and puzzle modes.
**Validates: Requirements 6.1**

**Property 26: Template Upload Integrity**
*For any* new template upload, the system should successfully upload the image to OSS and create a corresponding database record.
**Validates: Requirements 6.2**

**Property 27: Template Update Completeness**
*For any* template edit operation, all specified fields (name, description, sort order, status) should be updated.
**Validates: Requirements 6.3**

**Property 28: Template Deactivation Effect**
*For any* template deactivation, the template status should be set to inactive and the template should not appear in frontend queries.
**Validates: Requirements 6.4**

**Property 29: Template Usage Statistics Accuracy**
*For any* template usage statistics query, the usage count should accurately reflect the number of times the template was used.
**Validates: Requirements 6.5**

### Generation History Properties

**Property 30: Generation History Completeness**
*For any* generation history query, the system should return all generation records with their current status.
**Validates: Requirements 7.1**

**Property 31: Failed Task Filtering**
*For any* failed task filter, all returned records should have status 'failed'.
**Validates: Requirements 7.2**

**Property 32: Generation Detail Completeness**
*For any* generation detail request, the returned data should include original images, template, generated results, and task IDs.
**Validates: Requirements 7.3**

**Property 33: Task Retry Request**
*For any* failed task retry, the system should call the backend API to resubmit the generation task.
**Validates: Requirements 7.4**

**Property 34: Generation Statistics Accuracy**
*For any* generation statistics query, the calculated metrics (success rate, average generation time) should accurately reflect the underlying data.
**Validates: Requirements 7.5**

### Dashboard Properties

**Property 35: Dashboard Core Metrics Completeness**
*For any* dashboard query, the returned data should include all core metrics (today's new users, today's revenue, today's orders).
**Validates: Requirements 8.1**

**Property 36: Trend Chart Data Range**
*For any* trend chart query (7-day or 30-day), the returned data points should cover the specified time range.
**Validates: Requirements 8.2**

**Property 37: User Distribution Sum**
*For any* user distribution query, the sum of paid user percentage and free user percentage should equal 100%.
**Validates: Requirements 8.4**

**Property 38: Popular Template Sorting**
*For any* popular template query, the returned templates should be sorted by usage count in descending order and limited to top 10.
**Validates: Requirements 8.5**

### System Configuration Properties

**Property 39: Config List Completeness**
*For any* system configuration query, the system should return all configurable items (OSS, payment, API configs).
**Validates: Requirements 9.1**

**Property 40: Config Validation**
*For any* OSS configuration update, the system should validate the configuration before saving, rejecting invalid configurations.
**Validates: Requirements 9.2**

**Property 41: Payment Config Update**
*For any* payment configuration update, the system should successfully update WeChat Pay related parameters.
**Validates: Requirements 9.3**

**Property 42: API Key List Completeness**
*For any* API key query, the system should return all API keys with their usage information.
**Validates: Requirements 9.4**

**Property 43: API Key Uniqueness**
*For any* new API key generation, the generated key should be unique and returned only once.
**Validates: Requirements 9.5**

### Audit and Logging Properties

**Property 44: Operation Logging**
*For any* modification operation by an admin user, the system should create an operation log entry with all required metadata.
**Validates: Requirements 10.1**

**Property 45: Operation Log Completeness**
*For any* operation log query, the system should return all operation records with complete information.
**Validates: Requirements 10.2**

**Property 46: Log Filtering Accuracy**
*For any* log filter criteria (operator, operation type, time range), all returned logs should match the specified criteria.
**Validates: Requirements 10.3**

**Property 47: Log Export Completeness**
*For any* log export request, the generated file should contain all filtered log entries.
**Validates: Requirements 10.4**

**Property 48: Sensitive Operation Notification**
*For any* sensitive operation (data deletion, price modification), the system should send a notification to super administrators.
**Validates: Requirements 10.5**

### Error Monitoring Properties

**Property 49: Error Log Completeness**
*For any* error log query, the system should return all system error records.
**Validates: Requirements 11.1**

**Property 50: Error Filtering Accuracy**
*For any* error filter criteria (error type, time, severity), all returned errors should match the specified criteria.
**Validates: Requirements 11.2**

**Property 51: Error Detail Completeness**
*For any* error detail request, the returned data should include complete error stack trace and context information.
**Validates: Requirements 11.3**

**Property 52: Critical Error Alerting**
*For any* critical error occurrence, the system should send an alert notification to the technical team.
**Validates: Requirements 11.4**

**Property 53: Error Status Update**
*For any* error marked as resolved, the system should update the error status and record the resolution notes.
**Validates: Requirements 11.5**

### Data Export Properties

**Property 54: User Data Export Completeness**
*For any* user data export, the generated Excel file should contain all user fields.
**Validates: Requirements 12.1**

**Property 55: Order Data Export Completeness**
*For any* order data export, the generated Excel file should contain complete order details and associated user information.
**Validates: Requirements 12.2**

**Property 56: Generation History Export Completeness**
*For any* generation history export, the generated Excel file should contain complete generation records and statistics.
**Validates: Requirements 12.3**

**Property 57: Custom Report Field Selection**
*For any* custom report request, the generated report should only include the selected fields and apply the specified filter conditions.
**Validates: Requirements 12.4**


## Error Handling

### 前端错误处理

#### 1. API请求错误

```typescript
// 统一的API错误处理
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Axios拦截器
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // 401 未授权 - 跳转登录
      if (status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
        return Promise.reject(new ApiError(401, 'UNAUTHORIZED', '登录已过期，请重新登录'));
      }
      
      // 403 权限不足
      if (status === 403) {
        message.error('权限不足，无法执行此操作');
        return Promise.reject(new ApiError(403, 'FORBIDDEN', '权限不足'));
      }
      
      // 404 资源不存在
      if (status === 404) {
        return Promise.reject(new ApiError(404, 'NOT_FOUND', '请求的资源不存在'));
      }
      
      // 500 服务器错误
      if (status >= 500) {
        message.error('服务器错误，请稍后重试');
        return Promise.reject(new ApiError(status, 'SERVER_ERROR', '服务器错误'));
      }
      
      // 其他错误
      return Promise.reject(new ApiError(status, data.code || 'UNKNOWN', data.message || '请求失败', data));
    }
    
    // 网络错误
    if (error.request) {
      message.error('网络连接失败，请检查网络');
      return Promise.reject(new ApiError(0, 'NETWORK_ERROR', '网络连接失败'));
    }
    
    return Promise.reject(error);
  }
);
```

#### 2. 表单验证错误

```typescript
// 统一的表单验证规则
const formRules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 8, message: '密码长度至少8个字符' },
    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: '密码必须包含大小写字母和数字' }
  ],
  price: [
    { required: true, message: '请输入价格' },
    { type: 'number', min: 0, message: '价格不能为负数' },
    { type: 'number', max: 99999.99, message: '价格不能超过99999.99' }
  ]
};
```

#### 3. 组件错误边界

```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component Error:', error, errorInfo);
    // 上报错误到监控系统
    reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面加载失败"
          subTitle="抱歉，页面出现了一些问题"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
```

### 后端错误处理

#### 1. 统一错误响应格式

```javascript
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  console.error('Error:', err);
  
  // 操作错误（预期的错误）
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details
    });
  }
  
  // 编程错误（未预期的错误）
  // 记录到错误日志表
  errorLogService.logError('UNHANDLED_ERROR', err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  // 返回通用错误响应
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误'
  });
};
```

#### 2. 业务错误类型

```javascript
// 认证错误
class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(401, 'AUTHENTICATION_FAILED', message);
  }
}

// 权限错误
class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(403, 'AUTHORIZATION_FAILED', message);
  }
}

// 资源不存在错误
class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(404, 'NOT_FOUND', `${resource}不存在`);
  }
}

// 验证错误
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

// 业务逻辑错误
class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(400, code, message);
  }
}
```

#### 3. 数据库错误处理

```javascript
const handleDatabaseError = (error) => {
  // 唯一约束冲突
  if (error.code === 'ER_DUP_ENTRY') {
    throw new ValidationError('数据已存在，请勿重复提交');
  }
  
  // 外键约束冲突
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    throw new ValidationError('关联的数据不存在');
  }
  
  // 连接超时
  if (error.code === 'ETIMEDOUT') {
    throw new AppError(503, 'DATABASE_TIMEOUT', '数据库连接超时');
  }
  
  // 其他数据库错误
  console.error('Database Error:', error);
  throw new AppError(500, 'DATABASE_ERROR', '数据库操作失败');
};
```

#### 4. 第三方服务错误处理

```javascript
// 微信支付错误处理
const handleWechatPayError = (error) => {
  if (error.code === 'PARAM_ERROR') {
    throw new ValidationError('支付参数错误');
  }
  
  if (error.code === 'ORDERPAID') {
    throw new BusinessError('订单已支付', 'ORDER_ALREADY_PAID');
  }
  
  if (error.code === 'SYSTEMERROR') {
    throw new AppError(503, 'WECHAT_PAY_ERROR', '微信支付系统错误，请稍后重试');
  }
  
  throw new AppError(500, 'PAYMENT_ERROR', '支付失败');
};

// OSS上传错误处理
const handleOSSError = (error) => {
  if (error.code === 'NoSuchBucket') {
    throw new AppError(500, 'OSS_CONFIG_ERROR', 'OSS配置错误');
  }
  
  if (error.code === 'AccessDenied') {
    throw new AppError(500, 'OSS_AUTH_ERROR', 'OSS认证失败');
  }
  
  throw new AppError(500, 'OSS_UPLOAD_ERROR', '文件上传失败');
};
```

### 错误监控与告警

#### 1. 错误日志记录

```javascript
const errorLogService = {
  async logError(errorType, errorMessage, context = {}) {
    const connection = await db.pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO error_logs 
        (id, error_type, error_message, context, severity, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          uuidv4(),
          errorType,
          errorMessage,
          JSON.stringify(context),
          this.getSeverity(errorType)
        ]
      );
      
      // 如果是严重错误，发送告警
      if (this.isCritical(errorType)) {
        await this.sendAlert(errorType, errorMessage, context);
      }
    } finally {
      connection.release();
    }
  },
  
  getSeverity(errorType) {
    const criticalErrors = ['UNHANDLED_ERROR', 'DATABASE_ERROR', 'PAYMENT_ERROR'];
    return criticalErrors.includes(errorType) ? 'critical' : 'normal';
  },
  
  isCritical(errorType) {
    return this.getSeverity(errorType) === 'critical';
  },
  
  async sendAlert(errorType, errorMessage, context) {
    // 发送邮件/短信/企业微信通知
    console.log(`[ALERT] ${errorType}: ${errorMessage}`, context);
    // TODO: 实现实际的告警通知
  }
};
```

#### 2. 前端错误上报

```typescript
const reportError = (error: Error, errorInfo?: any) => {
  // 上报到后端
  axios.post('/admin-api/errors/report', {
    message: error.message,
    stack: error.stack,
    errorInfo,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  }).catch(err => {
    console.error('Failed to report error:', err);
  });
};
```

## Testing Strategy

### 测试方法论

本项目采用**双重测试策略**：单元测试验证具体示例和边界情况，属性测试验证通用正确性属性。两者互补，共同确保系统的全面正确性。

### 单元测试

**测试框架：** Jest + Supertest (后端), Jest + React Testing Library (前端)

**测试重点：**
- 具体示例验证
- 边界条件测试
- 错误处理测试
- 集成点测试

**示例：**

```javascript
// 后端单元测试示例
describe('Price Config API', () => {
  test('should create price config with valid data', async () => {
    const response = await request(app)
      .post('/admin-api/prices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'package',
        code: 'test_package',
        name: '测试套餐',
        price: 9.9,
        description: '测试描述'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.price).toBe(9.9);
  });
  
  test('should reject negative price', async () => {
    const response = await request(app)
      .post('/admin-api/prices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'package',
        code: 'invalid_package',
        name: '无效套餐',
        price: -10
      });
    
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});
```

```typescript
// 前端单元测试示例
describe('PriceConfig Component', () => {
  test('should render price list', async () => {
    const mockPrices = [
      { id: '1', name: '基础套餐', price: 9.9, status: 'active' },
      { id: '2', name: '尊享套餐', price: 29.9, status: 'active' }
    ];
    
    jest.spyOn(api, 'getPrices').mockResolvedValue(mockPrices);
    
    render(<PriceConfig />);
    
    await waitFor(() => {
      expect(screen.getByText('基础套餐')).toBeInTheDocument();
      expect(screen.getByText('9.9')).toBeInTheDocument();
    });
  });
});
```

### 属性测试

**测试框架：** fast-check (JavaScript/TypeScript)

**配置要求：**
- 每个属性测试至少运行100次迭代
- 每个测试必须引用设计文档中的属性编号
- 标签格式：`Feature: admin-dashboard, Property {number}: {property_text}`

**示例：**

```javascript
const fc = require('fast-check');

describe('Property Tests - Price Configuration', () => {
  // Feature: admin-dashboard, Property 21: Price Update Immediate Effect
  test('Property 21: Price updates should be immediately effective', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          priceId: fc.uuid(),
          newPrice: fc.double({ min: 0.01, max: 9999.99, noNaN: true })
        }),
        async ({ priceId, newPrice }) => {
          // 创建测试价格配置
          await createTestPriceConfig(priceId);
          
          // 更新价格
          await updatePrice(priceId, newPrice);
          
          // 立即查询价格
          const queriedPrice = await queryPrice(priceId);
          
          // 验证：查询到的价格应该等于新价格
          expect(queriedPrice).toBeCloseTo(newPrice, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: admin-dashboard, Property 22: Price History Recording
  test('Property 22: Price modifications should create history records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          priceId: fc.uuid(),
          oldPrice: fc.double({ min: 0.01, max: 9999.99 }),
          newPrice: fc.double({ min: 0.01, max: 9999.99 })
        }),
        async ({ priceId, oldPrice, newPrice }) => {
          // 创建初始价格配置
          await createTestPriceConfig(priceId, oldPrice);
          
          // 更新价格
          await updatePrice(priceId, newPrice);
          
          // 查询价格历史
          const history = await getPriceHistory(priceId);
          
          // 验证：应该有历史记录
          expect(history.length).toBeGreaterThan(0);
          
          // 验证：最新的历史记录应该包含旧价格和新价格
          const latestHistory = history[0];
          expect(latestHistory.oldPrice).toBeCloseTo(oldPrice, 2);
          expect(latestHistory.newPrice).toBeCloseTo(newPrice, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: admin-dashboard, Property 19: Package Distribution Sum
  test('Property 19: Package distribution percentages should sum to 100%', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            packageType: fc.constantFrom('free', 'basic', 'premium'),
            count: fc.nat({ max: 1000 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (orders) => {
          // 创建测试订单数据
          await createTestOrders(orders);
          
          // 查询套餐分布
          const distribution = await getPackageDistribution();
          
          // 验证：所有百分比之和应该等于100%
          const totalPercentage = distribution.reduce(
            (sum, item) => sum + item.percentage,
            0
          );
          expect(totalPercentage).toBeCloseTo(100, 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 测试覆盖率目标

- 后端API路由：90%以上
- 业务服务层：85%以上
- 前端组件：80%以上
- 关键业务逻辑：95%以上

### 测试执行

```bash
# 后端测试
cd backend
pnpm test                    # 运行所有测试
pnpm test:unit              # 仅运行单元测试
pnpm test:property          # 仅运行属性测试
pnpm test:coverage          # 生成覆盖率报告

# 前端测试
cd admin
pnpm test                    # 运行所有测试
pnpm test:watch             # 监听模式
pnpm test:coverage          # 生成覆盖率报告
```

