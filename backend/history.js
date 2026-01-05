/**
 * 历史记录管理模块
 * 负责管理生成任务的历史记录
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'db', 'history.json');

/**
 * 读取历史记录
 */
function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return [];
    }
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
}

/**
 * 写入历史记录
 */
function writeHistory(history) {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('写入历史记录失败:', error);
    throw error;
  }
}

/**
 * 添加历史记录
 */
function addHistoryRecord(record) {
  const history = readHistory();
  history.unshift(record); // 添加到开头
  writeHistory(history);
}

/**
 * 根据任务ID查找历史记录
 */
function findHistoryRecordByTaskId(taskId) {
  const history = readHistory();
  // 找到最新的匹配记录（有生成图片的）
  return history.find(record => 
    record.taskId === taskId && 
    record.generatedImageUrls && 
    record.generatedImageUrls.length > 0
  );
}

/**
 * 更新历史记录
 */
function updateHistoryRecord(taskId, updates) {
  const history = readHistory();
  const index = history.findIndex(record => record.taskId === taskId);
  
  if (index !== -1) {
    history[index] = {
      ...history[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeHistory(history);
    return history[index];
  }
  
  return null;
}

module.exports = {
  readHistory,
  writeHistory,
  addHistoryRecord,
  findHistoryRecordByTaskId,
  updateHistoryRecord
};
