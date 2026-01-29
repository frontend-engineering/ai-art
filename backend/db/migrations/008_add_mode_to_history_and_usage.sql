-- Migration: 008_add_mode_to_history_and_usage
-- Description: 添加模式字段支持多模式历史记录和隔离使用次数
-- Created: 2026-01-29

-- 1. 修改 generation_history 表，添加 mode 字段
ALTER TABLE generation_history 
ADD COLUMN mode ENUM('puzzle', 'transform') DEFAULT 'puzzle' COMMENT '生成模式: puzzle-时空拼图, transform-富贵变身' AFTER user_id;

-- 添加索引
ALTER TABLE generation_history 
ADD KEY idx_mode (mode),
ADD KEY idx_user_mode_created (user_id, mode, created_at);

-- 2. 修改 users 表，添加模式隔离的使用次数字段
ALTER TABLE users 
ADD COLUMN usage_count_puzzle INT DEFAULT 3 COMMENT '时空拼图免费次数' AFTER regenerate_count,
ADD COLUMN usage_count_transform INT DEFAULT 3 COMMENT '富贵变身免费次数' AFTER usage_count_puzzle,
ADD COLUMN usage_count_paid INT DEFAULT 0 COMMENT '付费次数' AFTER usage_count_transform;

-- 添加索引
ALTER TABLE users 
ADD KEY idx_usage_puzzle (usage_count_puzzle),
ADD KEY idx_usage_transform (usage_count_transform),
ADD KEY idx_usage_paid (usage_count_paid);

-- 3. 修改 usage_logs 表，添加 mode 字段
ALTER TABLE usage_logs 
ADD COLUMN mode ENUM('puzzle', 'transform', 'paid') DEFAULT 'puzzle' COMMENT '使用模式' AFTER reason;

-- 添加索引
ALTER TABLE usage_logs 
ADD KEY idx_mode (mode),
ADD KEY idx_user_mode_created (user_id, mode, created_at);

-- 4. 数据迁移：将现有的 usage_count 迁移到 usage_count_puzzle（假设现有数据都是时空拼图）
UPDATE users 
SET usage_count_puzzle = COALESCE(usage_count, 3) 
WHERE usage_count_puzzle = 3 AND usage_count IS NOT NULL AND usage_count != 3;

-- 5. 数据迁移：为现有的 generation_history 记录添加 mode 字段
-- 假设现有记录都是 puzzle 模式（因为 transform 是新模式）
UPDATE generation_history 
SET mode = 'puzzle' 
WHERE mode = 'puzzle';

