/**
 * 错误日志服务
 * 
 * 实现错误日志记录功能，将错误信息持久化到文件和数据库
 * 
 * 功能特性:
 * - 记录错误码、错误信息、时间戳
 * - 支持文件日志和数据库日志
 * - 自动日志轮转（按日期）
 * - 结构化日志格式
 * 
 * Requirements: 11.3
 */

const fs = require('fs');
const path = require('path');

/**
 * 错误日志级别
 */
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * 错误日志服务类
 */
class ErrorLogService {
  constructor() {
    // 日志目录
    this.logDir = path.join(__dirname, '..', 'logs');
    
    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // 当前日志文件路径
    this.currentLogFile = this.getLogFilePath();
  }
  
  /**
   * 获取当前日志文件路径（按日期）
   * @returns {string} 日志文件路径
   */
  getLogFilePath() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `error-${dateStr}.log`);
  }
  
  /**
   * 格式化日志条目
   * @param {string} level - 日志级别
   * @param {string} errorCode - 错误码
   * @param {string} errorMessage - 错误信息
   * @param {Object} context - 上下文信息
   * @returns {Object} 格式化的日志对象
   */
  formatLogEntry(level, errorCode, errorMessage, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      errorCode: errorCode || 'UNKNOWN_ERROR',
      errorMessage: errorMessage || 'Unknown error occurred',
      context: {
        ...context,
        pid: process.pid,
        hostname: require('os').hostname()
      }
    };
  }
  
  /**
   * 写入日志到文件
   * @param {Object} logEntry - 日志条目
   */
  writeToFile(logEntry) {
    try {
      // 检查是否需要切换日志文件（日期变更）
      const currentLogFile = this.getLogFilePath();
      if (currentLogFile !== this.currentLogFile) {
        this.currentLogFile = currentLogFile;
      }
      
      // 将日志对象转换为JSON字符串并追加到文件
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.currentLogFile, logLine, 'utf8');
    } catch (fileError) {
      // 如果文件写入失败，至少输出到控制台
      console.error('[ErrorLogService] 写入日志文件失败:', fileError);
      console.error('[ErrorLogService] 原始日志:', logEntry);
    }
  }
  
  /**
   * 写入日志到数据库
   * @param {Object} logEntry - 日志条目
   */
  async writeToDatabase(logEntry) {
    try {
      const db = require('../db/connection');
      const connection = await db.pool.getConnection();
      
      try {
        // 检查error_logs表是否存在，如果不存在则创建
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS error_logs (
            id VARCHAR(36) PRIMARY KEY,
            timestamp TIMESTAMP NOT NULL,
            level VARCHAR(20) NOT NULL,
            error_code VARCHAR(100),
            error_message TEXT,
            context JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_timestamp (timestamp),
            INDEX idx_level (level),
            INDEX idx_error_code (error_code)
          )
        `);
        
        // 生成UUID
        const { v4: uuidv4 } = require('uuid');
        const logId = uuidv4();
        
        // 转换 ISO 时间戳为 MySQL DATETIME 格式
        const mysqlTimestamp = new Date(logEntry.timestamp)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' ');
        
        // 插入日志记录
        await connection.execute(
          `INSERT INTO error_logs 
          (id, timestamp, level, error_code, error_message, context, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            logId,
            mysqlTimestamp,
            logEntry.level,
            logEntry.errorCode,
            logEntry.errorMessage,
            JSON.stringify(logEntry.context)
          ]
        );
      } finally {
        connection.release();
      }
    } catch (dbError) {
      // 如果数据库写入失败，至少输出到控制台
      console.error('[ErrorLogService] 写入数据库失败:', dbError);
      console.error('[ErrorLogService] 原始日志:', logEntry);
    }
  }
  
  /**
   * 记录错误日志
   * @param {string} errorCode - 错误码
   * @param {string} errorMessage - 错误信息
   * @param {Object} context - 上下文信息（可选）
   * @param {Object} options - 选项
   * @param {boolean} options.toFile - 是否写入文件（默认true）
   * @param {boolean} options.toDatabase - 是否写入数据库（默认true）
   * @param {boolean} options.toConsole - 是否输出到控制台（默认true）
   */
  async logError(errorCode, errorMessage, context = {}, options = {}) {
    const {
      toFile = true,
      toDatabase = true,
      toConsole = true
    } = options;
    
    // 格式化日志条目
    const logEntry = this.formatLogEntry(
      LogLevel.ERROR,
      errorCode,
      errorMessage,
      context
    );
    
    // 输出到控制台
    if (toConsole) {
      console.error(`[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.errorCode}] ${logEntry.errorMessage}`);
      if (Object.keys(context).length > 0) {
        console.error('Context:', JSON.stringify(context, null, 2));
      }
    }
    
    // 写入文件
    if (toFile) {
      this.writeToFile(logEntry);
    }
    
    // 写入数据库（异步，不阻塞）
    if (toDatabase) {
      // 使用Promise.resolve().then()确保异步执行，不阻塞主流程
      Promise.resolve().then(() => this.writeToDatabase(logEntry));
    }
    
    return logEntry;
  }
  
  /**
   * 记录警告日志
   * @param {string} errorCode - 错误码
   * @param {string} errorMessage - 错误信息
   * @param {Object} context - 上下文信息（可选）
   */
  async logWarning(errorCode, errorMessage, context = {}) {
    const logEntry = this.formatLogEntry(
      LogLevel.WARN,
      errorCode,
      errorMessage,
      context
    );
    
    console.warn(`[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.errorCode}] ${logEntry.errorMessage}`);
    this.writeToFile(logEntry);
    
    return logEntry;
  }
  
  /**
   * 记录信息日志
   * @param {string} message - 信息
   * @param {Object} context - 上下文信息（可选）
   */
  async logInfo(message, context = {}) {
    const logEntry = this.formatLogEntry(
      LogLevel.INFO,
      'INFO',
      message,
      context
    );
    
    console.log(`[${logEntry.timestamp}] [${logEntry.level}] ${logEntry.errorMessage}`);
    this.writeToFile(logEntry);
    
    return logEntry;
  }
  
  /**
   * 从Error对象中提取错误信息并记录
   * @param {Error} error - Error对象
   * @param {Object} context - 额外的上下文信息
   */
  async logErrorFromException(error, context = {}) {
    const errorCode = error.code || error.name || 'EXCEPTION';
    const errorMessage = error.message || 'An exception occurred';
    
    // 添加堆栈信息到上下文
    const enrichedContext = {
      ...context,
      stack: error.stack,
      name: error.name
    };
    
    return this.logError(errorCode, errorMessage, enrichedContext);
  }
  
  /**
   * 查询错误日志
   * @param {Object} filters - 过滤条件
   * @param {string} filters.level - 日志级别
   * @param {string} filters.errorCode - 错误码
   * @param {Date} filters.startDate - 开始日期
   * @param {Date} filters.endDate - 结束日期
   * @param {number} filters.limit - 返回数量限制
   * @returns {Array} 日志记录数组
   */
  async queryLogs(filters = {}) {
    try {
      const db = require('../db/connection');
      const connection = await db.pool.getConnection();
      
      try {
        let query = 'SELECT * FROM error_logs WHERE 1=1';
        const params = [];
        
        // 添加过滤条件
        if (filters.level) {
          query += ' AND level = ?';
          params.push(filters.level);
        }
        
        if (filters.errorCode) {
          query += ' AND error_code = ?';
          params.push(filters.errorCode);
        }
        
        if (filters.startDate) {
          query += ' AND timestamp >= ?';
          params.push(filters.startDate);
        }
        
        if (filters.endDate) {
          query += ' AND timestamp <= ?';
          params.push(filters.endDate);
        }
        
        // 按时间倒序排列
        query += ' ORDER BY timestamp DESC';
        
        // 限制返回数量
        if (filters.limit) {
          query += ' LIMIT ?';
          params.push(filters.limit);
        }
        
        const [rows] = await connection.execute(query, params);
        
        // 解析JSON字段
        return rows.map(row => ({
          ...row,
          context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context
        }));
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[ErrorLogService] 查询日志失败:', error);
      throw error;
    }
  }
  
  /**
   * 清理旧日志
   * @param {number} daysToKeep - 保留天数（默认30天）
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      // 清理数据库中的旧日志
      const db = require('../db/connection');
      const connection = await db.pool.getConnection();
      
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const [result] = await connection.execute(
          'DELETE FROM error_logs WHERE timestamp < ?',
          [cutoffDate]
        );
        
        console.log(`[ErrorLogService] 清理了 ${result.affectedRows} 条旧日志记录`);
        
        return result.affectedRows;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[ErrorLogService] 清理旧日志失败:', error);
      throw error;
    }
  }
  
  /**
   * 清理旧日志文件
   * @param {number} daysToKeep - 保留天数（默认30天）
   */
  cleanupOldLogFiles(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let deletedCount = 0;
      
      files.forEach(file => {
        if (file.startsWith('error-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`[ErrorLogService] 删除旧日志文件: ${file}`);
          }
        }
      });
      
      console.log(`[ErrorLogService] 清理了 ${deletedCount} 个旧日志文件`);
      return deletedCount;
    } catch (error) {
      console.error('[ErrorLogService] 清理旧日志文件失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const errorLogService = new ErrorLogService();

module.exports = errorLogService;
