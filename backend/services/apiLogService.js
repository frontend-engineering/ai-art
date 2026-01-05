/**
 * API调用日志服务
 * 记录所有AI API调用的输入参数和输出结果
 */

const fs = require('fs').promises;
const path = require('path');

// 日志目录
const LOG_DIR = path.join(__dirname, '../logs/api-calls');

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('创建日志目录失败:', error);
  }
}

/**
 * 记录API调用
 * @param {Object} logData 日志数据
 * @param {string} logData.mode 模式(puzzle/transform)
 * @param {string} logData.taskId 任务ID
 * @param {Object} logData.request 请求参数
 * @param {Object} logData.response API响应
 * @param {string} logData.status 状态(success/error)
 * @param {string} logData.error 错误信息(可选)
 */
async function logApiCall(logData) {
  try {
    await ensureLogDir();

    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    const logFileName = `${date}-${logData.mode || 'unknown'}.jsonl`;
    const logFilePath = path.join(LOG_DIR, logFileName);

    // 构建日志条目
    const logEntry = {
      timestamp,
      mode: logData.mode,
      taskId: logData.taskId,
      status: logData.status,
      request: {
        prompt: logData.request?.prompt,
        imageUrls: logData.request?.imageUrls,
        templateUrl: logData.request?.templateUrl,
        modelParams: logData.request?.modelParams,
        facePositions: logData.request?.facePositions
      },
      response: {
        taskId: logData.response?.taskId,
        imageUrls: logData.response?.imageUrls,
        status: logData.response?.status,
        message: logData.response?.message
      },
      error: logData.error,
      duration: logData.duration
    };

    // 追加到JSONL文件
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(logFilePath, logLine, 'utf8');

    console.log(`[API日志] 已记录到: ${logFileName}`);
  } catch (error) {
    console.error('[API日志] 记录失败:', error);
  }
}

/**
 * 查询API调用日志
 * @param {Object} filters 过滤条件
 * @param {string} filters.mode 模式
 * @param {string} filters.taskId 任务ID
 * @param {string} filters.date 日期(YYYY-MM-DD)
 * @param {number} filters.limit 返回数量限制
 * @returns {Promise<Array>} 日志条目数组
 */
async function queryApiLogs(filters = {}) {
  try {
    await ensureLogDir();

    const { mode, taskId, date, limit = 100 } = filters;
    const results = [];

    // 确定要读取的文件
    let filesToRead = [];
    if (date && mode) {
      filesToRead = [`${date}-${mode}.jsonl`];
    } else if (date) {
      const files = await fs.readdir(LOG_DIR);
      filesToRead = files.filter(f => f.startsWith(date));
    } else if (mode) {
      const files = await fs.readdir(LOG_DIR);
      filesToRead = files.filter(f => f.includes(`-${mode}.jsonl`));
    } else {
      const files = await fs.readdir(LOG_DIR);
      filesToRead = files.filter(f => f.endsWith('.jsonl'));
    }

    // 读取并解析日志文件
    for (const fileName of filesToRead) {
      const filePath = path.join(LOG_DIR, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        for (const line of lines) {
          if (!line) continue;
          
          try {
            const entry = JSON.parse(line);
            
            // 应用过滤条件
            if (taskId && entry.taskId !== taskId) continue;
            if (mode && entry.mode !== mode) continue;
            
            results.push(entry);
            
            if (results.length >= limit) {
              return results;
            }
          } catch (parseError) {
            console.error('解析日志行失败:', parseError);
          }
        }
      } catch (readError) {
        console.error(`读取日志文件失败 ${fileName}:`, readError);
      }
    }

    // 按时间倒序排序
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return results.slice(0, limit);
  } catch (error) {
    console.error('[API日志] 查询失败:', error);
    return [];
  }
}

/**
 * 获取最近的API调用日志
 * @param {number} limit 返回数量
 * @returns {Promise<Array>} 日志条目数组
 */
async function getRecentApiLogs(limit = 50) {
  return queryApiLogs({ limit });
}

/**
 * 根据任务ID获取API调用日志
 * @param {string} taskId 任务ID
 * @returns {Promise<Object|null>} 日志条目
 */
async function getApiLogByTaskId(taskId) {
  const logs = await queryApiLogs({ taskId, limit: 1 });
  return logs.length > 0 ? logs[0] : null;
}

/**
 * 清理旧日志文件
 * @param {number} days 保留天数
 * @returns {Promise<number>} 删除的文件数
 */
async function cleanOldLogs(days = 30) {
  try {
    await ensureLogDir();
    
    const files = await fs.readdir(LOG_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let deletedCount = 0;
    
    for (const fileName of files) {
      if (!fileName.endsWith('.jsonl')) continue;
      
      // 从文件名提取日期
      const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;
      
      const fileDate = new Date(dateMatch[1]);
      if (fileDate < cutoffDate) {
        const filePath = path.join(LOG_DIR, fileName);
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`[API日志] 已删除旧日志: ${fileName}`);
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[API日志] 清理失败:', error);
    return 0;
  }
}

module.exports = {
  logApiCall,
  queryApiLogs,
  getRecentApiLogs,
  getApiLogByTaskId,
  cleanOldLogs
};
