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

/**
 * 日志工具函数
 */
function logQueue(taskId, operation, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[TaskQueue][${timestamp}][${taskId || 'SYSTEM'}][${operation}]`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// 确保存储目录存在
async function ensureStorageDir() {
  try {
    await fs.mkdir(TASK_STORAGE_DIR, { recursive: true });
    logQueue(null, '初始化', `✅ 任务存储目录已创建: ${TASK_STORAGE_DIR}`);
  } catch (error) {
    logQueue(null, '初始化', `❌ 创建任务存储目录失败: ${error.message}`);
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
  
  logQueue(taskId, '创建', '========== 开始创建新任务 ==========');
  logQueue(taskId, '创建', '任务参数', {
    mode: params.mode || 'unknown',
    userId: params.userId || '',
    templateId: params.templateId || '',
    imageCount: params.imageUrls?.length || 0,
    hasPrompt: !!params.finalPrompt,
    hasFacePositions: !!params.facePositions
  });
  
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
  logQueue(taskId, '创建', '✅ 任务已添加到内存队列');
  
  // 异步持久化（不阻塞）
  persistTask(task)
    .then(() => logQueue(taskId, '持久化', '✅ 任务已持久化到文件'))
    .catch(err => logQueue(taskId, '持久化', `❌ 持久化失败: ${err.message}`));
  
  logQueue(taskId, '创建', '========== 任务创建完成 ==========');
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
    logQueue(taskId, '更新', '⚠️ 任务不存在，无法更新');
    return null;
  }
  
  const oldStatus = task.status;
  const oldProgress = task.progress;
  
  Object.assign(task, updates, { updatedAt: new Date().toISOString() });
  
  // 记录状态变化
  const changes = [];
  if (updates.status && updates.status !== oldStatus) {
    changes.push(`状态: ${oldStatus} → ${updates.status}`);
  }
  if (updates.progress !== undefined && updates.progress !== oldProgress) {
    changes.push(`进度: ${oldProgress}% → ${updates.progress}%`);
  }
  if (updates.message) {
    changes.push(`消息: ${updates.message}`);
  }
  if (updates.error) {
    changes.push(`错误: ${updates.error}`);
  }
  
  logQueue(taskId, '更新', `任务状态更新: ${changes.join(', ')}`);
  
  // 异步持久化
  persistTask(task)
    .then(() => logQueue(taskId, '持久化', '✅ 更新已持久化'))
    .catch(err => logQueue(taskId, '持久化', `❌ 持久化失败: ${err.message}`));
  
  return task;
}

/**
 * 获取任务信息
 * @param {string} taskId 任务ID
 * @returns {Object|null} 任务信息
 */
async function getTask(taskId) {
  logQueue(taskId, '查询', '正在获取任务信息...');
  
  // 先从内存获取
  let task = taskQueue.get(taskId);
  
  if (task) {
    logQueue(taskId, '查询', '✅ 从内存获取成功', {
      status: task.status,
      progress: task.progress
    });
    return task;
  }
  
  // 如果内存中没有，尝试从文件加载
  logQueue(taskId, '查询', '内存中未找到，尝试从文件加载...');
  task = await loadTask(taskId);
  if (task) {
    taskQueue.set(taskId, task);
    logQueue(taskId, '查询', '✅ 从文件加载成功', {
      status: task.status,
      progress: task.progress
    });
  } else {
    logQueue(taskId, '查询', '⚠️ 任务不存在');
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
      logQueue(taskId, '加载', `❌ 加载任务失败: ${error.message}`);
    }
    return null;
  }
}

/**
 * 删除任务（清理）
 * @param {string} taskId 任务ID
 */
async function deleteTask(taskId) {
  logQueue(taskId, '删除', '正在删除任务...');
  taskQueue.delete(taskId);
  try {
    const filePath = path.join(TASK_STORAGE_DIR, `${taskId}.json`);
    await fs.unlink(filePath);
    logQueue(taskId, '删除', '✅ 任务已删除');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logQueue(taskId, '删除', `❌ 删除任务文件失败: ${error.message}`);
    }
  }
}

/**
 * 获取用户的所有任务
 * @param {string} userId 用户ID
 * @returns {Array} 任务列表
 */
async function getUserTasks(userId) {
  logQueue(null, '查询用户任务', `正在获取用户 ${userId} 的任务列表...`);
  const tasks = [];
  
  // 从内存中筛选
  for (const task of taskQueue.values()) {
    if (task.meta.userId === userId) {
      tasks.push(task);
    }
  }
  
  logQueue(null, '查询用户任务', `✅ 找到 ${tasks.length} 个任务`);
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * 清理过期任务（超过24小时的已完成/失败任务）
 */
async function cleanupExpiredTasks() {
  const now = Date.now();
  const expireTime = 24 * 60 * 60 * 1000; // 24小时
  let cleanedCount = 0;
  
  logQueue(null, '清理', '========== 开始清理过期任务 ==========');
  
  for (const [taskId, task] of taskQueue.entries()) {
    const taskAge = now - new Date(task.createdAt).getTime();
    
    if (taskAge > expireTime && 
        (task.status === TaskStatus.COMPLETED || 
         task.status === TaskStatus.FAILED ||
         task.status === TaskStatus.CANCELLED)) {
      await deleteTask(taskId);
      cleanedCount++;
    }
  }
  
  logQueue(null, '清理', `✅ 清理完成，共清理 ${cleanedCount} 个过期任务`);
}

// 每小时清理一次过期任务
setInterval(cleanupExpiredTasks, 60 * 60 * 1000);

/**
 * 恢复未完成的任务（服务器重启后调用）
 * @param {Function} executeTaskFn 任务执行函数
 * @returns {Promise<Array>} 恢复的任务列表
 */
async function recoverPendingTasks(executeTaskFn) {
  logQueue(null, '恢复', '========== 开始恢复未完成任务 ==========');
  
  const recoveredTasks = [];
  
  try {
    // 确保存储目录存在
    await ensureStorageDir();
    
    // 读取所有任务文件
    const files = await fs.readdir(TASK_STORAGE_DIR);
    const taskFiles = files.filter(f => f.endsWith('.json'));
    
    logQueue(null, '恢复', `发现 ${taskFiles.length} 个任务文件`);
    
    for (const file of taskFiles) {
      try {
        const filePath = path.join(TASK_STORAGE_DIR, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const task = JSON.parse(data);
        
        // 检查是否是需要恢复的任务（pending 或 processing 状态）
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING) {
          logQueue(task.id, '恢复', `发现未完成任务`, {
            status: task.status,
            mode: task.meta?.mode,
            createdAt: task.createdAt
          });
          
          // 检查任务是否过期（超过1小时的任务标记为超时）
          const taskAge = Date.now() - new Date(task.createdAt).getTime();
          const maxAge = 60 * 60 * 1000; // 1小时
          
          if (taskAge > maxAge) {
            logQueue(task.id, '恢复', `任务已过期 (${Math.round(taskAge / 60000)} 分钟)，标记为超时`);
            task.status = TaskStatus.TIMEOUT;
            task.message = '任务超时，服务器重启后未能恢复';
            task.updatedAt = new Date().toISOString();
            task.completedAt = new Date().toISOString();
            await persistTask(task);
            taskQueue.set(task.id, task);
            continue;
          }
          
          // 将任务加载到内存队列
          taskQueue.set(task.id, task);
          
          // 重置为 pending 状态（如果是 processing 状态）
          if (task.status === TaskStatus.PROCESSING) {
            task.status = TaskStatus.PENDING;
            task.progress = 0;
            task.message = '任务恢复中，准备重新执行...';
            task.updatedAt = new Date().toISOString();
            await persistTask(task);
          }
          
          recoveredTasks.push(task);
          logQueue(task.id, '恢复', `✅ 任务已加入恢复队列`);
        } else {
          // 已完成/失败的任务也加载到内存（用于查询）
          taskQueue.set(task.id, task);
        }
      } catch (err) {
        logQueue(null, '恢复', `❌ 读取任务文件失败: ${file}, 错误: ${err.message}`);
      }
    }
    
    logQueue(null, '恢复', `共恢复 ${recoveredTasks.length} 个未完成任务`);
    
    // 如果有执行函数，异步执行恢复的任务
    if (executeTaskFn && recoveredTasks.length > 0) {
      logQueue(null, '恢复', '开始异步执行恢复的任务...');
      
      // 延迟执行，避免服务器启动时负载过高
      for (let i = 0; i < recoveredTasks.length; i++) {
        const task = recoveredTasks[i];
        const delay = i * 2000; // 每个任务间隔2秒
        
        setTimeout(() => {
          logQueue(task.id, '恢复执行', `开始执行恢复的任务 (${i + 1}/${recoveredTasks.length})`);
          executeTaskFn(task.id);
        }, delay);
      }
    }
    
    logQueue(null, '恢复', '========== 任务恢复完成 ==========');
    
  } catch (error) {
    logQueue(null, '恢复', `❌ 恢复任务失败: ${error.message}`);
  }
  
  return recoveredTasks;
}

/**
 * 获取所有 pending 状态的任务
 * @returns {Array} pending 任务列表
 */
function getPendingTasks() {
  const pendingTasks = [];
  for (const task of taskQueue.values()) {
    if (task.status === TaskStatus.PENDING) {
      pendingTasks.push(task);
    }
  }
  return pendingTasks;
}

/**
 * 获取任务队列统计信息
 * @returns {Object} 统计信息
 */
function getQueueStats() {
  const stats = {
    total: taskQueue.size,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    timeout: 0,
    cancelled: 0
  };
  
  for (const task of taskQueue.values()) {
    switch (task.status) {
      case TaskStatus.PENDING:
        stats.pending++;
        break;
      case TaskStatus.PROCESSING:
        stats.processing++;
        break;
      case TaskStatus.COMPLETED:
        stats.completed++;
        break;
      case TaskStatus.FAILED:
        stats.failed++;
        break;
      case TaskStatus.TIMEOUT:
        stats.timeout++;
        break;
      case TaskStatus.CANCELLED:
        stats.cancelled++;
        break;
    }
  }
  
  return stats;
}

module.exports = {
  TaskStatus,
  createTask,
  updateTask,
  getTask,
  deleteTask,
  getUserTasks,
  cleanupExpiredTasks,
  recoverPendingTasks,
  getPendingTasks,
  getQueueStats
};
