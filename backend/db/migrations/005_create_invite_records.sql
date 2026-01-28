-- Migration: 005_create_invite_records
-- Description: 创建邀请记录表
-- Created: 2026-01-15

CREATE TABLE IF NOT EXISTS invite_records (
  id VARCHAR(36) PRIMARY KEY COMMENT '记录ID (UUID)',
  inviter_id VARCHAR(36) NOT NULL COMMENT '邀请人ID',
  invitee_id VARCHAR(36) NOT NULL COMMENT '被邀请人ID',
  invite_code VARCHAR(20) NOT NULL COMMENT '使用的邀请码',
  reward_granted BOOLEAN DEFAULT FALSE COMMENT '是否已发放奖励',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_inviter_id (inviter_id),
  INDEX idx_invitee_id (invitee_id),
  INDEX idx_invite_code (invite_code),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_invitee (invitee_id) COMMENT '每个用户只能被邀请一次'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请记录表';
