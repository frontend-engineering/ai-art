/**
 * 异步任务服务
 * 
 * 提供任务状态轮询、重试、取消等功能
 * 解决长时间运行任务的前端体验问题
 */

import { buildApiUrl, API_ENDPOINTS } from './apiConfig';

// 任务状态枚举
export const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled'
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// 任务信息接口
export interface TaskInfo {
  taskId: string;
  status: TaskStatusType;
  progress: number;
  message: string;
  result: {
    images: string[];
    generatedAt: string;
  } | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  meta: {
    mode: string;
    userId: string;
    templateId: string;
    imageCount: number;
  };
}

// 轮询配置
const POLL_CONFIG = {
  initialInterval: 1000,    // 初始轮询间隔 1秒
  maxInterval: 5000,        // 最大轮询间隔 5秒
  intervalMultiplier: 1.2,  // 间隔递增倍数
  maxDuration: 180000,      // 最大轮询时长 3分钟
};

/**
 * 日志工具函数
 */
function logTask(taskId: string, stage: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[TaskService][${timestamp}][${taskId}][${stage}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(taskId: string): Promise<TaskInfo> {
  logTask(taskId, '查询', '正在获取任务状态...');
  
  const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_GET(taskId)));
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logTask(taskId, '查询', `❌ 获取失败: ${response.status}`, errorData);
    throw new Error(errorData.message || `获取任务状态失败: ${response.status}`);
  }
  
  const result = await response.json();
  logTask(taskId, '查询', '✅ 获取成功', {
    status: result.data.status,
    progress: result.data.progress,
    message: result.data.message
  });
  return result.data;
}

/**
 * 重试任务
 */
export async function retryTask(taskId: string): Promise<void> {
  logTask(taskId, '重试', '正在发起重试请求...');
  
  const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_RETRY(taskId)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logTask(taskId, '重试', `❌ 重试失败: ${response.status}`, errorData);
    throw new Error(errorData.message || '重试任务失败');
  }
  
  logTask(taskId, '重试', '✅ 重试请求已发送');
}

/**
 * 取消任务
 */
export async function cancelTask(taskId: string): Promise<void> {
  logTask(taskId, '取消', '正在发起取消请求...');
  
  const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_CANCEL(taskId)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logTask(taskId, '取消', `❌ 取消失败: ${response.status}`, errorData);
    throw new Error(errorData.message || '取消任务失败');
  }
  
  logTask(taskId, '取消', '✅ 取消请求已发送');
}

/**
 * 轮询任务状态
 * 
 * @param taskId 任务ID
 * @param onProgress 进度回调
 * @param onComplete 完成回调
 * @param onError 错误回调
 * @returns 取消轮询的函数
 */
export function pollTaskStatus(
  taskId: string,
  onProgress: (task: TaskInfo) => void,
  onComplete: (task: TaskInfo) => void,
  onError: (error: string, task?: TaskInfo) => void
): () => void {
  let cancelled = false;
  let interval = POLL_CONFIG.initialInterval;
  const startTime = Date.now();
  let pollCount = 0;
  
  logTask(taskId, '轮询', '========== 开始轮询任务状态 ==========');
  logTask(taskId, '轮询', '轮询配置', POLL_CONFIG);
  
  const poll = async () => {
    if (cancelled) {
      logTask(taskId, '轮询', '轮询已取消，停止执行');
      return;
    }
    
    pollCount++;
    const elapsed = Date.now() - startTime;
    
    // 检查是否超过最大轮询时长
    if (elapsed > POLL_CONFIG.maxDuration) {
      logTask(taskId, '轮询', `❌ 轮询超时，已耗时 ${elapsed}ms，超过最大时长 ${POLL_CONFIG.maxDuration}ms`);
      onError('任务处理超时，请稍后查看结果或重试');
      return;
    }
    
    logTask(taskId, '轮询', `第 ${pollCount} 次轮询，已耗时 ${elapsed}ms，当前间隔 ${interval}ms`);
    
    try {
      const task = await getTaskStatus(taskId);
      
      if (cancelled) {
        logTask(taskId, '轮询', '轮询已取消，丢弃结果');
        return;
      }
      
      logTask(taskId, '轮询', `任务状态: ${task.status}, 进度: ${task.progress}%`);
      
      // 根据状态处理
      switch (task.status) {
        case TaskStatus.COMPLETED:
          logTask(taskId, '轮询', '✅ 任务完成！', {
            imageCount: task.result?.images?.length || 0,
            totalPolls: pollCount,
            totalTime: `${elapsed}ms`
          });
          onComplete(task);
          return;
          
        case TaskStatus.FAILED:
        case TaskStatus.TIMEOUT:
          logTask(taskId, '轮询', `❌ 任务失败: ${task.error}`, {
            status: task.status,
            retryCount: task.retryCount,
            totalPolls: pollCount
          });
          onError(task.error || '任务失败', task);
          return;
          
        case TaskStatus.CANCELLED:
          logTask(taskId, '轮询', '⚠️ 任务已取消');
          onError('任务已取消', task);
          return;
          
        case TaskStatus.PENDING:
        case TaskStatus.PROCESSING:
        default:
          logTask(taskId, '轮询', `任务进行中: ${task.message}`);
          onProgress(task);
          // 继续轮询，逐渐增加间隔
          const newInterval = Math.min(interval * POLL_CONFIG.intervalMultiplier, POLL_CONFIG.maxInterval);
          logTask(taskId, '轮询', `下次轮询间隔: ${Math.round(newInterval)}ms`);
          interval = newInterval;
          setTimeout(poll, interval);
          break;
      }
    } catch (error) {
      if (cancelled) {
        logTask(taskId, '轮询', '轮询已取消，忽略错误');
        return;
      }
      
      logTask(taskId, '轮询', `⚠️ 轮询出错: ${error instanceof Error ? error.message : '未知错误'}，将继续重试`);
      // 网络错误时继续重试
      setTimeout(poll, interval);
    }
  };
  
  // 开始轮询
  poll();
  
  // 返回取消函数
  return () => {
    logTask(taskId, '轮询', '收到取消信号，停止轮询');
    cancelled = true;
  };
}

/**
 * 判断任务是否可以重试
 */
export function canRetryTask(task: TaskInfo): boolean {
  return task.status === TaskStatus.FAILED || task.status === TaskStatus.TIMEOUT;
}

/**
 * 判断任务是否可以取消
 */
export function canCancelTask(task: TaskInfo): boolean {
  return task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING;
}

/**
 * 获取任务状态的友好描述
 */
export function getTaskStatusText(status: TaskStatusType): string {
  const statusMap: Record<TaskStatusType, string> = {
    [TaskStatus.PENDING]: '等待处理',
    [TaskStatus.PROCESSING]: '正在生成',
    [TaskStatus.COMPLETED]: '生成完成',
    [TaskStatus.FAILED]: '生成失败',
    [TaskStatus.TIMEOUT]: '处理超时',
    [TaskStatus.CANCELLED]: '已取消'
  };
  return statusMap[status] || '未知状态';
}

export default {
  TaskStatus,
  getTaskStatus,
  retryTask,
  cancelTask,
  pollTaskStatus,
  canRetryTask,
  canCancelTask,
  getTaskStatusText
};
