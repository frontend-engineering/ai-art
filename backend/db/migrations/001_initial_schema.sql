-- Migration: 001_initial_schema
-- Description: 初始数据库结构
-- Created: 2026-01-05

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY COMMENT '用户ID (UUID)',
  wechat_openid VARCHAR(100) UNIQUE COMMENT '微信OpenID',
  nickname VARCHAR(100) COMMENT '用户昵称',
  avatar_url TEXT COMMENT '头像URL',
  payment_status ENUM('free', 'basic', 'premium') DEFAULT 'free' COMMENT '付费状态',
  regenerate_count INT DEFAULT 3 COMMENT '重新生成次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_wechat_openid (wechat_openid),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 生成历史记录表
CREATE TABLE IF NOT EXISTS generation_history (
  id VARCHAR(36) PRIMARY KEY COMMENT '记录ID (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  task_ids JSON NOT NULL COMMENT '任务ID列表 (JSON数组)',
  original_image_urls JSON NOT NULL COMMENT '原始图片URL列表 (JSON数组)',
  template_url TEXT COMMENT '模板URL',
  generated_image_urls JSON COMMENT '生成的图片URL列表 (JSON数组)',
  selected_image_url TEXT COMMENT '用户选中的图片URL',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '生成状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生成历史记录表';

-- 3. 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '订单ID (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  generation_id VARCHAR(36) COMMENT '关联的生成记录ID',
  amount DECIMAL(10, 2) NOT NULL COMMENT '订单金额',
  package_type ENUM('free', 'basic', 'premium') NOT NULL COMMENT '套餐类型',
  payment_method VARCHAR(50) DEFAULT 'wechat' COMMENT '支付方式',
  transaction_id VARCHAR(100) COMMENT '第三方交易ID',
  status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (generation_id) REFERENCES generation_history(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- 4. 产品订单表
CREATE TABLE IF NOT EXISTS product_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '订单ID (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  generation_id VARCHAR(36) NOT NULL COMMENT '关联的生成记录ID',
  product_type ENUM('crystal', 'scroll') NOT NULL COMMENT '产品类型: crystal-晶瓷画, scroll-卷轴',
  product_price DECIMAL(10, 2) NOT NULL COMMENT '产品价格',
  shipping_name VARCHAR(100) NOT NULL COMMENT '收货人姓名',
  shipping_phone VARCHAR(20) NOT NULL COMMENT '收货人电话',
  shipping_address TEXT NOT NULL COMMENT '收货地址',
  status ENUM('pending', 'paid', 'exported', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (generation_id) REFERENCES generation_history(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品订单表';

-- 5. 贺卡表
CREATE TABLE IF NOT EXISTS greeting_cards (
  id VARCHAR(36) PRIMARY KEY COMMENT '贺卡ID (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  image_url TEXT NOT NULL COMMENT '照片URL',
  greeting_text TEXT NOT NULL COMMENT '祝福语',
  template_style VARCHAR(50) DEFAULT 'classic' COMMENT '模板样式',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='贺卡表';
