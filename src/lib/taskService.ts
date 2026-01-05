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
 * 获取任务状态
 */
export async function getTaskStatus(taskId: string): Promise<TaskInfo> {
  const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_GET(taskId)));
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `获取任务状态失败: ${response.status}`);
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * 重试任务
 */
export async function retryTask(taskId: string): Promise<void> {
  const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_RETRY(taskId)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || '重试任务失败');
  }
}

/**
 * 取消任务
 */
export async function cancelTask(taskId: string): Promise<void> {
  const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_CANCEL(taskId)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || '取消任务失败');
  }
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
  
  const poll = async () => {
    if (cancelled) return;
    
    // 检查是否超过最大轮询时长
    if (Date.now() - startTime > POLL_CONFIG.maxDuration) {
      onError('任务处理超时，请稍后查看结果或重试');
      return;
    }
    
    try {
      const task = await getTaskStatus(taskId);
      
      if (cancelled) return;
      
      // 根据状态处理
      switch (task.status) {
        case TaskStatus.COMPLETED:
          onComplete(task);
          return;
          
        case TaskStatus.FAILED:
        case TaskStatus.TIMEOUT:
          onError(task.error || '任务失败', task);
          return;
          
        case TaskStatus.CANCELLED:
          onError('任务已取消', task);
          return;
          
        case TaskStatus.PENDING:
        case TaskStatus.PROCESSING:
        default:
          onProgress(task);
          // 继续轮询，逐渐增加间隔
          interval = Math.min(interval * POLL_CONFIG.intervalMultiplier, POLL_CONFIG.maxInterval);
          setTimeout(poll, interval);
          break;
      }
    } catch (error) {
      if (cancelled) return;
      
      console.error('轮询任务状态失败:', error);
      // 网络错误时继续重试
      setTimeout(poll, interval);
    }
  };
  
  // 开始轮询
  poll();
  
  // 返回取消函数
  return () => {
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
