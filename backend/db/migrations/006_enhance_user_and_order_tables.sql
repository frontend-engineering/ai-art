-- Migration: 006_enhance_user_and_order_tables
-- Description: 增强用户表和订单表字段，添加 unionid 等关键字段
-- Created: 2026-01-27

-- ============================================
-- 1. 增强 users 表
-- ============================================

-- 添加 unionid 字段（跨小程序用户身份识别）
ALTER TABLE users 
ADD COLUMN unionid VARCHAR(64) UNIQUE COMMENT '微信 UnionID，用于跨小程序用户识别'
AFTER openid;

-- 添加 nickname 字段
ALTER TABLE users 
ADD COLUMN nickname VARCHAR(100) COMMENT '用户昵称'
AFTER unionid;

-- 添加 avatar_url 字段
ALTER TABLE users 
ADD COLUMN avatar_url TEXT COMMENT '用户头像URL'
AFTER nickname;

-- 添加 phone 字段
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) COMMENT '手机号'
AFTER avatar_url;

-- 添加 last_login_at 字段
ALTER TABLE users 
ADD COLUMN last_login_at TIMESTAMP NULL COMMENT '最后登录时间'
AFTER regenerate_count;

-- 添加 unionid 索引
ALTER TABLE users ADD INDEX idx_unionid (unionid);

-- ============================================
-- 2. 增强 payment_orders 表
-- ============================================

-- 添加 out_trade_no 字段（商户订单号，用于查询）
ALTER TABLE payment_orders 
ADD COLUMN out_trade_no VARCHAR(64) UNIQUE COMMENT '商户订单号，用于查询订单状态'
AFTER transaction_id;

-- 添加 paid_at 字段
ALTER TABLE payment_orders 
ADD COLUMN paid_at TIMESTAMP NULL COMMENT '实际支付完成时间'
AFTER status;

-- 添加 refund_reason 字段
ALTER TABLE payment_orders 
ADD COLUMN refund_reason VARCHAR(500) COMMENT '退款原因'
AFTER paid_at;

-- 添加 remark 字段
ALTER TABLE payment_orders 
ADD COLUMN remark TEXT COMMENT '订单备注信息'
AFTER refund_reason;

-- 添加 out_trade_no 索引
ALTER TABLE payment_orders ADD INDEX idx_out_trade_no (out_trade_no);

-- ============================================
-- 3. 数据完整性检查
-- ============================================

-- 检查是否有重复的 openid
SELECT openid, COUNT(*) as count 
FROM users 
WHERE openid IS NOT NULL 
GROUP BY openid 
HAVING count > 1;

-- 检查是否有重复的 transaction_id
SELECT transaction_id, COUNT(*) as count 
FROM payment_orders 
WHERE transaction_id IS NOT NULL 
GROUP BY transaction_id 
HAVING count > 1;
