-- Migration: 005_create_admin_tables
-- Description: 创建管理后台相关表
-- Created: 2026-01-16
-- IMPORTANT: 此迁移只创建新表，不修改任何现有表

-- 1. 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(36) PRIMARY KEY COMMENT '管理员ID',
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  role ENUM('super_admin', 'operator', 'support') DEFAULT 'operator' COMMENT '角色',
  email VARCHAR(100) COMMENT '邮箱',
  status ENUM('active', 'locked', 'disabled') DEFAULT 'active' COMMENT '状态',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  login_attempts INT DEFAULT 0 COMMENT '登录尝试次数',
  locked_until TIMESTAMP NULL COMMENT '锁定截止时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员用户表';

-- 2. 价格配置表
CREATE TABLE IF NOT EXISTS price_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  category ENUM('package', 'product', 'service') NOT NULL COMMENT '类别',
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '价格代码（如：basic_package, crystal_product）',
  name VARCHAR(100) NOT NULL COMMENT '名称',
  price DECIMAL(10, 2) NOT NULL COMMENT '价格',
  description TEXT COMMENT '描述',
  effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '生效时间',
  status ENUM('active', 'inactive', 'scheduled') DEFAULT 'active' COMMENT '状态',
  created_by VARCHAR(36) COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_effective_date (effective_date),
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格配置表';

-- 3. 价格历史表
CREATE TABLE IF NOT EXISTS price_history (
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
  FOREIGN KEY (changed_by) REFERENCES admin_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格历史表';

-- 4. 操作日志表
CREATE TABLE IF NOT EXISTS admin_operation_logs (
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
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 5. 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT NOT NULL COMMENT '配置值',
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
  category VARCHAR(50) COMMENT '配置分类（oss, payment, api）',
  description TEXT COMMENT '配置描述',
  is_sensitive BOOLEAN DEFAULT FALSE COMMENT '是否敏感信息',
  updated_by VARCHAR(36) COMMENT '更新人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_config_key (config_key),
  INDEX idx_category (category),
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 6. 模板配置表
CREATE TABLE IF NOT EXISTS template_configs (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_mode (mode),
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order),
  INDEX idx_usage_count (usage_count),
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板配置表';

-- 插入默认超级管理员账户
-- 密码: Admin@123456 (需要在应用层使用bcrypt加密后再插入)
-- 这里先插入占位符，实际密码将在应用启动时设置
INSERT INTO admin_users (id, username, password_hash, role, email, status) 
VALUES (
  'admin-default-001',
  'admin',
  '$2b$10$placeholder',  -- 占位符，需要在应用中替换
  'super_admin',
  'admin@example.com',
  'active'
) ON DUPLICATE KEY UPDATE id=id;

-- 插入初始价格配置（从现有代码迁移）
INSERT INTO price_configs (id, category, code, name, price, description, status) VALUES
('price-001', 'package', 'free_package', '免费版', 0.00, '免费版套餐', 'active'),
('price-002', 'package', 'basic_package', '尝鲜包', 9.90, '尝鲜包套餐', 'active'),
('price-003', 'package', 'premium_package', '尊享包', 29.90, '尊享包套餐', 'active'),
('price-004', 'product', 'crystal_product', '晶瓷画', 68.00, '晶瓷画实体产品', 'active'),
('price-005', 'product', 'scroll_product', '卷轴', 128.00, '卷轴实体产品', 'active')
ON DUPLICATE KEY UPDATE id=id;
