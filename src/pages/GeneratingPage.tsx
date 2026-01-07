import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CornerBackground from '@/components/CornerBackground';
import { useElderMode } from '@/contexts/ElderModeContext';
import PageTransition from '@/components/PageTransition';
import { 
  pollTaskStatus, 
  retryTask, 
  TaskStatus, 
  type TaskInfo,
  getTaskStatusText,
  canRetryTask
} from '@/lib/taskService';

// 进度阶段配置
const PROGRESS_STAGES = [
  { progress: 10, text: '任务已创建' },
  { progress: 30, text: '连接AI服务' },
  { progress: 50, text: '生成艺术照' },
  { progress: 70, text: '处理图片' },
  { progress: 90, text: '优化细节' },
  { progress: 100, text: '完成' }
];

// 根据进度获取阶段文案
function getStageText(progress: number): string {
  for (let i = PROGRESS_STAGES.length - 1; i >= 0; i--) {
    if (progress >= PROGRESS_STAGES[i].progress) {
      return PROGRESS_STAGES[i].text;
    }
  }
  return PROGRESS_STAGES[0].text;
}

// 获取祝福语
function getBlessingText(stage: string): string {
  const blessings: Record<string, string> = {
    '任务已创建': '福气满满',
    '连接AI服务': '好运连连',
    '生成艺术照': '喜气洋洋',
    '处理图片': '光彩照人',
    '优化细节': '精雕细琢',
    '完成': '恭喜发财'
  };
  return blessings[stage] || '吉祥如意';
}

export default function GeneratingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId, userId, mode, uploadedImages, selectedTemplate } = location.state || {};
  const { isElderMode, voiceEnabled, speak } = useElderMode();
  
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('任务已创建');
  const [taskMessage, setTaskMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  
  const cancelPollRef = useRef<(() => void) | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // 日志工具函数
  const logPage = (stage: string, message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = `[GeneratingPage][${timestamp}][${taskId || 'NO_TASK'}][${stage}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  };

  // 页面加载时记录日志
  useEffect(() => {
    logPage('初始化', '========== 生成页面加载 ==========');
    logPage('初始化', '页面参数', {
      taskId,
      userId,
      mode,
      uploadedImagesCount: uploadedImages?.length || 0,
      selectedTemplate: selectedTemplate?.id || selectedTemplate
    });
  }, []);

  // 页面加载时播放语音引导
  useEffect(() => {
    if (voiceEnabled) {
      logPage('语音', '播放语音引导');
      speak('正在为您生成艺术照，请稍候');
    }
  }, [voiceEnabled, speak]);

  // 生成完成时播放语音提示
  useEffect(() => {
    if (progress === 100 && voiceEnabled) {
      logPage('语音', '播放完成提示');
      speak('生成完成，即将为您展示结果');
    }
  }, [progress, voiceEnabled, speak]);

  // 错误时播放语音提示
  useEffect(() => {
    if (error && voiceEnabled) {
      logPage('语音', '播放错误提示');
      speak('生成失败，请点击重试按钮');
    }
  }, [error, voiceEnabled, speak]);

  // 平滑进度动画
  useEffect(() => {
    if (!taskInfo) return;
    
    const targetProgress = taskInfo.progress;
    logPage('进度动画', `目标进度: ${targetProgress}%, 当前进度: ${progress}%`);
    
    // 清除之前的定时器
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // 平滑过渡到目标进度
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          return targetProgress;
        }
        const increment = Math.max(1, (targetProgress - prev) * 0.1);
        return Math.min(prev + increment, targetProgress);
      });
    }, 100);
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [taskInfo?.progress]);

  // 更新阶段文案
  useEffect(() => {
    const stage = getStageText(progress);
    if (stage !== currentStage) {
      logPage('阶段更新', `阶段变化: ${currentStage} → ${stage}`);
      setCurrentStage(stage);
    }
  }, [progress]);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId) {
      logPage('错误', '❌ 缺少任务ID，无法查询生成状态');
      setError('缺少任务ID，无法查询生成状态');
      return;
    }

    logPage('轮询', '开始轮询任务状态');
    
    // 开始轮询
    cancelPollRef.current = pollTaskStatus(
      taskId,
      // 进度回调
      (task) => {
        logPage('进度回调', `收到进度更新: ${task.progress}%, 状态: ${task.status}`, {
          message: task.message,
          retryCount: task.retryCount
        });
        setTaskInfo(task);
        setTaskMessage(task.message);
      },
      // 完成回调
      (task) => {
        logPage('完成回调', '✅ 任务完成！', {
          imageCount: task.result?.images?.length || 0,
          generatedAt: task.result?.generatedAt
        });
        setTaskInfo(task);
        setProgress(100);
        setCurrentStage('完成');
        
        // 获取生成的图片
        const generatedImages = task.result?.images || [];
        logPage('完成回调', `准备跳转到结果页，图片数量: ${generatedImages.length}`);
        
        // 延迟跳转，让用户看到完成状态
        setTimeout(() => {
          // 如果只有一张图片，直接跳转到结果页，跳过选择页
          if (generatedImages.length === 1) {
            const targetPath = mode ? `/${mode}/result` : '/result';
            logPage('跳转', `只有1张图片，直接跳转到结果页: ${targetPath}`);
            
            // 创建历史记录项
            const historyItem = {
              id: taskId || Date.now().toString(),
              originalImages: uploadedImages || [],
              generatedImage: generatedImages[0],
              createdAt: new Date().toISOString(),
              isPaid: false,
              regenerateCount: 3,
              mode: mode
            };
            
            navigate(targetPath, {
              state: {
                selectedImage: generatedImages[0],
                historyItem,
                hasLivePhoto: false
              }
            });
          } else {
            // 多张图片，跳转到选择页
            const targetPath = mode ? `/${mode}/result-selector` : '/result-selector';
            logPage('跳转', `跳转到选择页: ${targetPath}`);
            navigate(targetPath, {
              state: {
                mode,
                uploadedImages,
                selectedTemplate,
                generatedImages,
                taskId
              }
            });
          }
        }, 1000);
      },
      // 错误回调
      (errorMsg, task) => {
        logPage('错误回调', `❌ 任务失败: ${errorMsg}`, {
          status: task?.status,
          retryCount: task?.retryCount,
          maxRetries: task?.maxRetries
        });
        setError(errorMsg);
        if (task) {
          setTaskInfo(task);
        }
      }
    );

    return () => {
      logPage('清理', '组件卸载，取消轮询');
      if (cancelPollRef.current) {
        cancelPollRef.current();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [taskId, navigate, mode, uploadedImages, selectedTemplate]);

  // 重试生成
  const handleRetry = async () => {
    if (!taskId) return;
    
    logPage('重试', '========== 用户点击重试 ==========');
    setIsRetrying(true);
    setError(null);
    setProgress(0);
    setCurrentStage('任务已创建');

    try {
      // 调用重试接口
      logPage('重试', '正在调用重试接口...');
      await retryTask(taskId);
      logPage('重试', '✅ 重试接口调用成功');
      
      // 重新开始轮询
      if (cancelPollRef.current) {
        cancelPollRef.current();
      }
      
      logPage('重试', '重新开始轮询');
      cancelPollRef.current = pollTaskStatus(
        taskId,
        (task) => {
          logPage('重试-进度', `进度: ${task.progress}%, 状态: ${task.status}`);
          setTaskInfo(task);
          setTaskMessage(task.message);
        },
        (task) => {
          logPage('重试-完成', '✅ 重试后任务完成！');
          setTaskInfo(task);
          setProgress(100);
          setCurrentStage('完成');
          
          const generatedImages = task.result?.images || [];
          
          setTimeout(() => {
            // 如果只有一张图片，直接跳转到结果页
            if (generatedImages.length === 1) {
              const targetPath = mode ? `/${mode}/result` : '/result';
              
              const historyItem = {
                id: taskId || Date.now().toString(),
                originalImages: uploadedImages || [],
                generatedImage: generatedImages[0],
                createdAt: new Date().toISOString(),
                isPaid: false,
                regenerateCount: 3,
                mode: mode
              };
              
              navigate(targetPath, {
                state: {
                  selectedImage: generatedImages[0],
                  historyItem,
                  hasLivePhoto: false
                }
              });
            } else {
              const targetPath = mode ? `/${mode}/result-selector` : '/result-selector';
              navigate(targetPath, {
                state: {
                  mode,
                  uploadedImages,
                  selectedTemplate,
                  generatedImages,
                  taskId
                }
              });
            }
          }, 1000);
        },
        (errorMsg, task) => {
          logPage('重试-错误', `❌ 重试后仍然失败: ${errorMsg}`);
          setError(errorMsg);
          if (task) {
            setTaskInfo(task);
          }
        }
      );
    } catch (err) {
      logPage('重试', `❌ 重试失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setError(err instanceof Error ? err.message : '重试失败，请稍后再试');
    } finally {
      setIsRetrying(false);
    }
  };

  // 查看案例（跳转到首页）
  const handleViewExamples = () => {
    logPage('操作', '用户点击查看案例');
    navigate('/');
  };

  return (
    <PageTransition>
      <CornerBackground>
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-4">
          {/* 装饰背景元素 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-20 left-10 text-3xl opacity-20"
              animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              🏮
            </motion.div>
            <motion.div
              className="absolute bottom-32 right-10 text-3xl opacity-20"
              animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              🏮
            </motion.div>
            <motion.div
              className="absolute top-1/3 right-1/4 text-2xl opacity-10"
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              ✨
            </motion.div>
          </div>
      
          <div className="z-10 w-full max-w-md px-2 sm:px-0 flex flex-col items-center">
            {/* 主灯笼动画 */}
            <motion.div
              className="relative mb-6"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* 灯笼光晕 */}
              <motion.div
                className="absolute inset-0 rounded-full bg-[#FFD700]/20 blur-xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: '120px', height: '120px', left: '-10px', top: '-10px' }}
              />
              <div className="text-7xl sm:text-8xl relative">🏮</div>
            </motion.div>

            {/* 标题 */}
            <motion.h1
              className="text-xl sm:text-2xl font-bold text-center text-[#FFD700] mb-5"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              AI艺术照生成中
            </motion.h1>

            {/* 进度条容器 */}
            <div className="w-full mb-5">
              {/* 金色边框进度条 */}
              <div className="relative p-0.5 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
                <div className="w-full h-3 bg-[#8B0000]/80 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#D4AF37] relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* 进度条光效 */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </div>
              </div>
          
              {/* 进度百分比和文案 */}
              <motion.div
                className="mt-4 text-center"
                key={currentStage}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-3xl sm:text-4xl font-bold text-[#FFD700] mb-2">
                  {Math.round(progress)}%
                </p>
                <div className="flex items-center justify-center">
                  <span className="text-white/90 text-base">
                    {currentStage}...
                    <span className="text-[#FFD700] ml-2">{getBlessingText(currentStage)}</span>
                  </span>
                </div>
                {taskMessage && (
                  <p className="text-sm text-white/60 mt-2">{taskMessage}</p>
                )}
              </motion.div>
            </div>

            {/* 任务状态提示卡片 */}
            <AnimatePresence>
              {taskInfo && !error && taskInfo.status !== TaskStatus.COMPLETED && (
                <motion.div
                  className="w-full mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="relative p-0.5 rounded-xl bg-gradient-to-r from-[#FFD700]/50 via-[#FFC700]/50 to-[#FFD700]/50">
                    <div className="bg-[#8B0000]/90 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-[#FFD700] text-center text-sm mb-1 font-medium">
                        {getTaskStatusText(taskInfo.status)}
                      </p>
                      <p className="text-center text-xs text-white/70">
                        AI正在为您精心创作，请耐心等待...
                      </p>
                      {taskInfo.retryCount > 0 && (
                        <p className="text-center text-xs text-[#FFD700]/80 mt-2">
                          已重试 {taskInfo.retryCount} 次
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="relative p-0.5 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
                    <div className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-3">⚠️</div>
                      <h3 className="text-lg font-bold text-[#FFD700] mb-2">生成失败</h3>
                      <p className="text-sm text-white/90 mb-4">{error}</p>
                      {taskInfo && canRetryTask(taskInfo) && (
                        <button
                          onClick={handleRetry}
                          disabled={isRetrying}
                          className="w-full h-11 rounded-full bg-gradient-to-r from-[#FFD700] to-[#D4AF37] text-[#8B0000] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                          {isRetrying ? '重试中...' : '点击重试'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 查看案例按钮 */}
            {!error && taskInfo && !isElderMode && (
              <motion.button
                onClick={handleViewExamples}
                className="w-full mt-4 bg-white/10 backdrop-blur-sm text-white/90 py-3 px-6 rounded-xl text-sm font-medium hover:bg-white/20 transition-all border border-white/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                先看别人的作品
              </motion.button>
            )}

            {/* 温馨提示 */}
            {!error && (
              <motion.p
                className="mt-5 text-center text-xs text-white/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                页面刷新后可通过历史记录查看结果
              </motion.p>
            )}
          </div>
        </div>
      </CornerBackground>
    </PageTransition>
  );
}
