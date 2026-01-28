-- Migration: 006_create_invite_stats
-- Description: 创建邀请统计表
-- Created: 2026-01-15

CREATE TABLE IF NOT EXISTS invite_stats (
  user_id VARCHAR(36) PRIMARY KEY COMMENT '用户ID',
  total_invites INT DEFAULT 0 COMMENT '总邀请数',
  successful_invites INT DEFAULT 0 COMMENT '成功邀请数',
  total_rewards INT DEFAULT 0 COMMENT '总获得奖励次数',
  last_invite_at TIMESTAMP NULL COMMENT '最后邀请时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请统计表';
