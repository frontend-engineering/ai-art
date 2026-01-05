/**
 * 异步任务队列服务
 * 
 * 设计思路：
 * 1. 任务提交后立即返回 taskId，不阻塞前端
 * 2. 后台异步执行任务，更新任务状态
 * 3. 前端通过轮询获取任务状态和结果
 * 4. 支持任务重试、超时处理、错误恢复
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// 任务状态枚举
const TaskStatus = {
  PENDING: 'pending',      // 等待处理
  PROCESSING: 'processing', // 处理中
  COMPLETED: 'completed',   // 已完成
  FAILED: 'failed',        // 失败
  TIMEOUT: 'timeout',      // 超时
  CANCELLED: 'cancelled'   // 已取消
};

// 内存任务队列（生产环境建议使用 Redis）
const taskQueue = new Map();

// 任务持久化目录
const TASK_STORAGE_DIR = path.join(__dirname, '../db/tasks');

// 确保存储目录存在
async function ensureStorageDir() {
  try {
    await fs.mkdir(TASK_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('创建任务存储目录失败:', error);
  }
}

// 初始化
ensureStorageDir();

/**
 * 创建新任务
 * @param {Object} params 任务参数
 * @returns {Object} 任务信息
 */
function createTask(params) {
  const taskId = uuidv4();
  const now = new Date().toISOString();
  
  const task = {
    id: taskId,
    status: TaskStatus.PENDING,
    progress: 0,
    message: '任务已创建，等待处理',
    params: params,
    result: null,
    error: null,
    retryCount: 0,
    maxRetries: 2,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    // 任务元数据
    meta: {
      mode: params.mode || 'unknown',
      userId: params.userId || '',
      templateId: params.templateId || '',
      imageCount: params.imageUrls?.length || 0
    }
  };
  
  taskQueue.set(taskId, task);
  
  // 异步持久化（不阻塞）
  persistTask(task).catch(err => console.error('持久化任务失败:', err));
  
  console.log(`[TaskQueue] 任务已创建: ${taskId}`);
  return task;
}

/**
 * 更新任务状态
 * @param {string} taskId 任务ID
 * @param {Object} updates 更新内容
 */
function updateTask(taskId, updates) {
  const task = taskQueue.get(taskId);
  if (!task) {
    console.warn(`[TaskQueue] 任务不存在: ${taskId}`);
    return null;
  }
  
  Object.assign(task, updates, { updatedAt: new Date().toISOString() });
  
  // 异步持久化
  persistTask(task).catch(err => console.error('持久化任务失败:', err));
  
  return task;
}

/**
 * 获取任务信息
 * @param {string} taskId 任务ID
 * @returns {Object|null} 任务信息
 */
async function getTask(taskId) {
  // 先从内存获取
  let task = taskQueue.get(taskId);
  
  // 如果内存中没有，尝试从文件加载
  if (!task) {
    task = await loadTask(taskId);
    if (task) {
      taskQueue.set(taskId, task);
    }
  }
  
  return task;
}

/**
 * 持久化任务到文件
 * @param {Object} task 任务对象
 */
async function persistTask(task) {
  const filePath = path.join(TASK_STORAGE_DIR, `${task.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8');
}

/**
 * 从文件加载任务
 * @param {string} taskId 任务ID
 * @returns {Object|null} 任务对象
 */
async function loadTask(taskId) {
  try {
    const filePath = path.join(TASK_STORAGE_DIR, `${taskId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`加载任务失败 ${taskId}:`, error);
    }
    return null;
  }
}

/**
 * 删除任务（清理）
 * @param {string} taskId 任务ID
 */
async function deleteTask(taskId) {
  taskQueue.delete(taskId);
  try {
    const filePath = path.join(TASK_STORAGE_DIR, `${taskId}.json`);
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`删除任务文件失败 ${taskId}:`, error);
    }
  }
}

/**
 * 获取用户的所有任务
 * @param {string} userId 用户ID
 * @returns {Array} 任务列表
 */
async function getUserTasks(userId) {
  const tasks = [];
  
  // 从内存中筛选
  for (const task of taskQueue.values()) {
    if (task.meta.userId === userId) {
      tasks.push(task);
    }
  }
  
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * 清理过期任务（超过24小时的已完成/失败任务）
 */
async function cleanupExpiredTasks() {
  const now = Date.now();
  const expireTime = 24 * 60 * 60 * 1000; // 24小时
  
  for (const [taskId, task] of taskQueue.entries()) {
    const taskAge = now - new Date(task.createdAt).getTime();
    
    if (taskAge > expireTime && 
        (task.status === TaskStatus.COMPLETED || 
         task.status === TaskStatus.FAILED ||
         task.status === TaskStatus.CANCELLED)) {
      await deleteTask(taskId);
      console.log(`[TaskQueue] 清理过期任务: ${taskId}`);
    }
  }
}

// 每小时清理一次过期任务
setInterval(cleanupExpiredTasks, 60 * 60 * 1000);

module.exports = {
  TaskStatus,
  createTask,
  updateTask,
  getTask,
  deleteTask,
  getUserTasks,
  cleanupExpiredTasks
};
