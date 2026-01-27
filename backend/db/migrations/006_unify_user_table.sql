-- ============================================
-- 统一用户表迁移脚本
-- 版本: 006
-- 日期: 2026-01-27
-- 说明: 为 users 表添加业务系统字段，支持微信统一登录
-- ============================================

-- 1. 为 users 表添加新字段
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_key VARCHAR(100) COMMENT '微信会话密钥（加密存储）' AFTER unionid,
  ADD COLUMN IF NOT EXISTS status ENUM('active', 'banned', 'pending') DEFAULT 'active' COMMENT '账户状态' AFTER phone,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT COMMENT '封禁原因' AFTER status,
  ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP NULL COMMENT '封禁截止时间' AFTER ban_reason,
  ADD COLUMN IF NOT EXISTS business_level ENUM('free', 'pro', 'enterprise') DEFAULT 'free' COMMENT '业务等级' AFTER payment_status,
  ADD COLUMN IF NOT EXISTS daily_limit INT DEFAULT 10 COMMENT '每日部署限制' AFTER business_level,
  ADD COLUMN IF NOT EXISTS used_today INT DEFAULT 0 COMMENT '今日已使用' AFTER daily_limit,
  ADD COLUMN IF NOT EXISTS total_deployments INT DEFAULT 0 COMMENT '总部署次数' AFTER used_today,
  ADD COLUMN IF NOT EXISTS total_quota INT DEFAULT 100 COMMENT '总配额' AFTER total_deployments,
  ADD COLUMN IF NOT EXISTS used_quota INT DEFAULT 0 COMMENT '已使用配额' AFTER total_quota,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) COMMENT '最后登录IP' AFTER last_login_at,
  ADD COLUMN IF NOT EXISTS last_login_source ENUM('miniprogram', 'web') COMMENT '最后登录来源' AFTER last_login_ip;

-- 2. 添加索引
ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_business_level (business_level),
  ADD INDEX IF NOT EXISTS idx_status (status);

-- 3. 修改 openid 为 NOT NULL（先更新空值）
UPDATE users SET openid = CONCAT('temp-', id) WHERE openid IS NULL OR openid = '';
ALTER TABLE users MODIFY openid VARCHAR(64) NOT NULL COMMENT '微信OpenID';

-- 4. 确保 openid 有唯一索引
ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS uk_openid (openid);

-- 完成
SELECT 'User table migration completed successfully!' as status;
