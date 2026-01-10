-- Migration: 添加 openid 字段
-- 创建时间: 2026-01-10
-- 说明: 为 users 表添加 openid 字段，用于微信登录

-- 添加 openid 字段
ALTER TABLE users ADD COLUMN openid VARCHAR(100) UNIQUE COMMENT '微信OpenID';

-- 添加索引
CREATE INDEX idx_openid ON users(openid);
