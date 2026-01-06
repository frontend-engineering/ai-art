/**
 * 管理员路由模块
 */

const express = require('express');
const router = express.Router();
const cleanupService = require('../services/cleanupService');
const errorLogService = require('../services/errorLogService');
const apiLogService = require('../services/apiLogService');

// 手动清理
router.post('/cleanup', async (req, res) => {
  try {
    const { days } = req.body;
    const deletedCount = await cleanupService.manualCleanup(days || 30);
    
    res.json({ 
      success: true, 
      message: `清理完成，删除了 ${deletedCount} 条记录`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('手动清理失败:', error);
    res.status(500).json({ error: '手动清理失败', message: error.message });
  }
});

// 查询错误日志
router.get('/error-logs', async (req, res) => {
  try {
    const { level, errorCode, startDate, endDate, limit } = req.query;
    
    const filters = {};
    if (level) filters.level = level;
    if (errorCode) filters.errorCode = errorCode;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    filters.limit = limit ? parseInt(limit) : 100;
    
    const logs = await errorLogService.queryLogs(filters);
    
    res.json({ success: true, data: { logs, count: logs.length } });
  } catch (error) {
    console.error('查询错误日志失败:', error);
    res.status(500).json({ error: '查询错误日志失败', message: error.message });
  }
});

// 清理旧错误日志
router.post('/error-logs/cleanup', async (req, res) => {
  try {
    const { daysToKeep } = req.body;
    const days = daysToKeep ? parseInt(daysToKeep) : 30;
    
    const dbDeletedCount = await errorLogService.cleanupOldLogs(days);
    const fileDeletedCount = errorLogService.cleanupOldLogFiles(days);
    
    res.json({
      success: true,
      message: '清理完成',
      data: { databaseRecordsDeleted: dbDeletedCount, logFilesDeleted: fileDeletedCount, daysKept: days }
    });
  } catch (error) {
    console.error('清理错误日志失败:', error);
    await errorLogService.logError('ERROR_LOG_CLEANUP_FAILED', error.message, {});
    res.status(500).json({ error: '清理错误日志失败', message: error.message });
  }
});

// 手动记录错误日志
router.post('/error-logs/log', async (req, res) => {
  try {
    const { errorCode, errorMessage, context } = req.body;
    
    if (!errorCode || !errorMessage) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 errorCode 和 errorMessage 参数' });
    }
    
    const logEntry = await errorLogService.logError(errorCode, errorMessage, context || {});
    
    res.json({ success: true, message: '错误日志已记录', data: logEntry });
  } catch (error) {
    console.error('记录错误日志失败:', error);
    res.status(500).json({ error: '记录错误日志失败', message: error.message });
  }
});

// 查询API调用日志
router.get('/api-logs', async (req, res) => {
  try {
    const { mode, taskId, date, limit } = req.query;
    
    const logs = await apiLogService.queryApiLogs({
      mode, taskId, date, limit: limit ? parseInt(limit) : 50
    });
    
    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    console.error('查询API日志失败:', error);
    res.status(500).json({ error: '查询API日志失败', message: error.message });
  }
});

// 获取最近的API调用日志
router.get('/api-logs/recent', async (req, res) => {
  try {
    const { limit } = req.query;
    const logs = await apiLogService.getRecentApiLogs(limit ? parseInt(limit) : 20);
    
    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    console.error('获取最近API日志失败:', error);
    res.status(500).json({ error: '获取最近API日志失败', message: error.message });
  }
});

// 根据任务ID获取API调用日志
router.get('/api-logs/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const log = await apiLogService.getApiLogByTaskId(taskId);
    
    if (!log) {
      return res.status(404).json({ error: '未找到日志', message: `任务ID ${taskId} 的日志不存在` });
    }
    
    res.json({ success: true, data: log });
  } catch (error) {
    console.error('获取API日志失败:', error);
    res.status(500).json({ error: '获取API日志失败', message: error.message });
  }
});

module.exports = router;
