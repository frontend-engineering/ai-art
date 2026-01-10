-- Migration: 002_add_error_logs
-- Description: 添加错误日志表
-- Created: 2026-01-05

CREATE TABLE IF NOT EXISTS error_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID (UUID)',
  timestamp TIMESTAMP NOT NULL COMMENT '错误时间戳',
  level VARCHAR(20) NOT NULL COMMENT '日志级别: error, warn, info',
  error_code VARCHAR(100) COMMENT '错误代码',
  error_message TEXT COMMENT '错误信息',
  context JSON COMMENT '错误上下文 (JSON)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_error_code (error_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='错误日志表';
