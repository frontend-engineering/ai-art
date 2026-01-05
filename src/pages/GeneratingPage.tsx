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

  // 页面加载时播放语音引导
  useEffect(() => {
    if (voiceEnabled) {
      speak('正在为您生成艺术照，请稍候');
    }
  }, [voiceEnabled, speak]);

  // 生成完成时播放语音提示
  useEffect(() => {
    if (progress === 100 && voiceEnabled) {
      speak('生成完成，即将为您展示结果');
    }
  }, [progress, voiceEnabled, speak]);

  // 错误时播放语音提示
  useEffect(() => {
    if (error && voiceEnabled) {
      speak('生成失败，请点击重试按钮');
    }
  }, [error, voiceEnabled, speak]);

  // 平滑进度动画
  useEffect(() => {
    if (!taskInfo) return;
    
    const targetProgress = taskInfo.progress;
    
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
    setCurrentStage(stage);
  }, [progress]);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId) {
      setError('缺少任务ID，无法查询生成状态');
      return;
    }

    // 开始轮询
    cancelPollRef.current = pollTaskStatus(
      taskId,
      // 进度回调
      (task) => {
        setTaskInfo(task);
        setTaskMessage(task.message);
      },
      // 完成回调
      (task) => {
        setTaskInfo(task);
        setProgress(100);
        setCurrentStage('完成');
        
        // 获取生成的图片
        const generatedImages = task.result?.images || [];
        
        // 延迟跳转，让用户看到完成状态
        setTimeout(() => {
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
        }, 1000);
      },
      // 错误回调
      (errorMsg, task) => {
        setError(errorMsg);
        if (task) {
          setTaskInfo(task);
        }
      }
    );

    return () => {
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
    
    setIsRetrying(true);
    setError(null);
    setProgress(0);
    setCurrentStage('任务已创建');

    try {
      // 调用重试接口
      await retryTask(taskId);
      
      // 重新开始轮询
      if (cancelPollRef.current) {
        cancelPollRef.current();
      }
      
      cancelPollRef.current = pollTaskStatus(
        taskId,
        (task) => {
          setTaskInfo(task);
          setTaskMessage(task.message);
        },
        (task) => {
          setTaskInfo(task);
          setProgress(100);
          setCurrentStage('完成');
          
          const generatedImages = task.result?.images || [];
          
          setTimeout(() => {
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
          }, 1000);
        },
        (errorMsg, task) => {
          setError(errorMsg);
          if (task) {
            setTaskInfo(task);
          }
        }
      );
    } catch (err) {
      console.error('重试失败:', err);
      setError(err instanceof Error ? err.message : '重试失败，请稍后再试');
    } finally {
      setIsRetrying(false);
    }
  };

  // 查看案例（跳转到首页）
  const handleViewExamples = () => {
    navigate('/');
  };

  return (
    <PageTransition>
      <CornerBackground>
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-4">
          {/* 装饰背景元素 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-20 left-10 text-4xl opacity-10"
              animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              ☁️
            </motion.div>
            <motion.div
              className="absolute bottom-40 right-10 text-4xl opacity-10"
              animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            >
              ☁️
            </motion.div>
          </div>
      
          <div className="z-10 w-full max-w-md">
            {/* 旋转灯笼动画 */}
            <motion.div
              className="flex justify-center mb-8"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="text-8xl">🏮</div>
            </motion.div>

            {/* 标题 */}
            <motion.h1
              className="text-2xl font-bold text-center text-[#FFD700] mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              AI艺术照生成中
            </motion.h1>

            {/* 进度条 - 金色渐变 */}
            <div className="mb-6">
              <div className="relative">
                <div className="relative p-0.5 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
                  <div className="w-full h-4 bg-[#8B0000] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
          
              {/* 进度百分比和文案 */}
              <motion.div
                className="mt-4 text-center"
                key={currentStage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-3xl font-bold text-[#FFD700] mb-2">
                  {Math.round(progress)}%
                </p>
                <div className="flex items-center justify-center text-white/90">
                  <span className="text-lg">～ {currentStage}...{getBlessingText(currentStage)} ～</span>
                </div>
                {taskMessage && (
                  <p className="text-sm text-white/70 mt-2">{taskMessage}</p>
                )}
              </motion.div>
            </div>

            {/* 任务状态提示 */}
            <AnimatePresence>
              {taskInfo && !error && taskInfo.status !== TaskStatus.COMPLETED && (
                <motion.div
                  className="relative mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="relative bg-gradient-to-r from-[#F4E4C1] via-[#FFF8DC] to-[#F4E4C1] rounded-lg p-4 border-2 border-[#D4AF37] shadow-lg">
                    <div className="absolute top-2 left-2 text-[#D4AF37] text-xs">🎋</div>
                    <div className="absolute top-2 right-2 text-[#D4AF37] text-xs">🎋</div>
                
                    <p className="text-[#8B4513] text-center mb-2">
                      {getTaskStatusText(taskInfo.status)}
                    </p>
                    <p className="text-center text-sm text-[#8B4513]/80">
                      AI正在为您精心创作，请耐心等待...
                    </p>
                    {taskInfo.retryCount > 0 && (
                      <p className="text-center text-xs text-[#D4302B] mt-2">
                        已重试 {taskInfo.retryCount} 次
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="relative p-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
                    <div className="bg-gradient-to-br from-[#8B0000] to-[#B8001F] rounded-xl p-6 text-center">
                      <div className="text-5xl mb-3">⚠️</div>
                      <h3 className="text-lg font-bold text-[#FFD700] mb-2">生成失败</h3>
                      <p className="text-white/90 mb-4">{error}</p>
                      {taskInfo && canRetryTask(taskInfo) && (
                        <button
                          onClick={handleRetry}
                          disabled={isRetrying}
                          className="relative w-full h-12 rounded-full overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                            <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full flex items-center justify-center hover:from-[#F4C430] hover:to-[#D4AF37] transition-all duration-300">
                              <span className="text-[#8B0000] text-lg font-bold">
                                {isRetrying ? '重试中...' : '点击重试'}
                              </span>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 查看案例按钮 - 老年模式下隐藏 */}
            {!error && taskInfo && !isElderMode && (
              <motion.button
                onClick={handleViewExamples}
                className="w-full mt-4 bg-white/20 backdrop-blur-sm text-white py-3 px-6 rounded-lg font-medium hover:bg-white/30 transition-all border border-white/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <i className="fas fa-eye mr-2"></i>
                先看别人的作品
              </motion.button>
            )}

            {/* 温馨提示 */}
            {!error && (
              <motion.p
                className="mt-6 text-center text-sm text-white/70"
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
