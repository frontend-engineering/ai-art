-- Migration: 004_extend_users_table
-- Description: 扩展users表，添加使用次数限制系统相关字段
-- Created: 2026-01-15

-- 添加使用次数相关字段
ALTER TABLE users
ADD COLUMN usage_count INT DEFAULT 3 COMMENT '当前剩余使用次数',
ADD COLUMN usage_limit INT DEFAULT 3 COMMENT '总使用次数上限（暂不使用）',
ADD COLUMN invite_code VARCHAR(20) UNIQUE COMMENT '用户邀请码',
ADD COLUMN has_ever_paid BOOLEAN DEFAULT FALSE COMMENT '是否曾经付费',
ADD COLUMN first_payment_at TIMESTAMP NULL COMMENT '首次付费时间',
ADD COLUMN last_payment_at TIMESTAMP NULL COMMENT '最后付费时间';

-- 添加索引
CREATE INDEX idx_invite_code ON users(invite_code);
CREATE INDEX idx_has_ever_paid ON users(has_ever_paid);

-- 为现有用户初始化数据
-- 注意：invite_code将在应用层生成，这里只设置usage_count
UPDATE users SET usage_count = 3 WHERE usage_count IS NULL;

-- 根据payment_orders表判断has_ever_paid
UPDATE users u
SET has_ever_paid = TRUE,
    first_payment_at = (
        SELECT MIN(created_at) 
        FROM payment_orders 
        WHERE user_id = u.id AND status = 'paid'
    ),
    last_payment_at = (
        SELECT MAX(created_at) 
        FROM payment_orders 
        WHERE user_id = u.id AND status = 'paid'
    )
WHERE EXISTS (
    SELECT 1 FROM payment_orders 
    WHERE user_id = u.id AND status = 'paid'
);
