-- ============================================
-- 修复生产环境同步差异
-- 版本: 008
-- 日期: 2026-01-28
-- 说明: 修复本地数据库与生产环境的差异
-- ============================================

-- ============================================
-- 1. 修复 users 表
-- ============================================

-- 修改 openid 字段类型（从 VARCHAR(100) 改为 VARCHAR(64)）
ALTER TABLE users MODIFY COLUMN openid VARCHAR(64) DEFAULT NULL COMMENT '微信小程序openid';

-- 添加缺失的字段（按生产环境顺序）
-- 检查并添加 level 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'level';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN level ENUM(''free'',''pro'',''enterprise'') NOT NULL DEFAULT ''free'' COMMENT ''用户等级'' AFTER phone',
  'SELECT ''Column level already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 status 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN status ENUM(''active'',''banned'',''pending'') NOT NULL DEFAULT ''active'' COMMENT ''账号状态'' AFTER level',
  'SELECT ''Column status already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 daily_limit 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'daily_limit';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN daily_limit INT NOT NULL DEFAULT 10 COMMENT ''每日部署限额'' AFTER status',
  'SELECT ''Column daily_limit already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 used_today 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'used_today';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN used_today INT NOT NULL DEFAULT 0 COMMENT ''今日已使用'' AFTER daily_limit',
  'SELECT ''Column used_today already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 total_quota 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'total_quota';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN total_quota INT NOT NULL DEFAULT 100 COMMENT ''总配额'' AFTER used_today',
  'SELECT ''Column total_quota already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 used_quota 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'used_quota';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN used_quota INT NOT NULL DEFAULT 0 COMMENT ''已使用配额'' AFTER total_quota',
  'SELECT ''Column used_quota already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 修改 created_at 和 updated_at 为 NOT NULL
ALTER TABLE users MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
ALTER TABLE users MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- ============================================
-- 2. 修复 payment_orders 表
-- ============================================

-- 检查并添加 _openid 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = '_openid';
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE payment_orders ADD COLUMN _openid VARCHAR(256) NOT NULL DEFAULT '''' COMMENT ''用于权限管理，请不要删除''',
  'SELECT ''Column _openid already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 修改 created_at 和 updated_at 为 NOT NULL
ALTER TABLE payment_orders MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
ALTER TABLE payment_orders MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- ============================================
-- 3. 验证修复结果
-- ============================================

-- 检查 users 表字段数量（应该是 17 个字段）
SELECT COUNT(*) as users_field_count 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users';

-- 检查 payment_orders 表字段数量（应该是 16 个字段）
SELECT COUNT(*) as payment_orders_field_count 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders';

SELECT 'Database structure fixed successfully!' as status;
