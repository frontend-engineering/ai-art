import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CornerBackground from '@/components/CornerBackground';
import { useElderMode } from '@/contexts/ElderModeContext';
import PageTransition from '@/components/PageTransition';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/apiConfig';

// 进度阶段配置
const PROGRESS_STAGES = [
  { progress: 20, text: '识别人脸' },
  { progress: 40, text: '调和光线' },
  { progress: 60, text: '融合背景' },
  { progress: 80, text: '优化细节' },
  { progress: 100, text: '完成' }
];

export default function GeneratingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId, userId, mode, uploadedImages, selectedTemplate } = location.state || {};
  const { isElderMode, voiceEnabled, speak } = useElderMode();
  
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('识别人脸');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const pollingIntervalRef = useRef<number | null>(null);
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

  // 模拟进度增长
  useEffect(() => {
    if (!taskId) {
      setError('缺少任务ID，无法查询生成状态');
      return;
    }

    // 模拟进度条平滑增长
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        // 找到当前应该在的阶段
        const currentStageIndex = PROGRESS_STAGES.findIndex(stage => prev < stage.progress);
        if (currentStageIndex !== -1) {
          const targetProgress = PROGRESS_STAGES[currentStageIndex].progress;
          const increment = (targetProgress - prev) * 0.1; // 10%的增量
          const newProgress = Math.min(prev + increment, targetProgress - 5); // 留5%的余地等待真实完成
          
          // 更新当前阶段文案
          if (newProgress >= PROGRESS_STAGES[currentStageIndex].progress - 10) {
            setCurrentStage(PROGRESS_STAGES[currentStageIndex].text);
          }
          
          return newProgress;
        }
        return prev;
      });
    }, 200);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [taskId]);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId) return;

    const pollTaskStatus = async () => {
      try {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.TASK_STATUS(taskId)));
        
        if (!response.ok) {
          throw new Error('查询任务状态失败');
        }

        const result = await response.json();
        const taskData = result.data?.Result?.data;

        if (!taskData) {
          console.warn('任务数据为空');
          return;
        }

        // 更新队列信息（模拟）
        if (taskData.status === 'pending' || taskData.status === 'processing') {
          // 模拟队列位置和等待时间
          setQueuePosition(Math.max(1, Math.floor(Math.random() * 5)));
          setEstimatedWaitTime(Math.max(5, Math.floor(Math.random() * 15)));
        }

        // 任务完成
        if (taskData.status === 'done' && taskData.uploaded_image_urls) {
          // 停止轮询和进度模拟
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }

          // 设置进度为100%
          setProgress(100);
          setCurrentStage('完成');

          // 延迟跳转，让用户看到完成状态
          setTimeout(() => {
            // 根据模式跳转到对应的结果选择页
            const targetPath = mode ? `/${mode}/result-selector` : '/result-selector';
            navigate(targetPath, {
              state: {
                mode,
                uploadedImages,
                selectedTemplate,
                generatedImages: taskData.uploaded_image_urls,
                taskId
              }
            });
          }, 1000);
        }

        // 任务失败
        if (taskData.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          
          setError(taskData.reason || '生成失败，请重试');
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err);
        // 不立即显示错误，继续重试
      }
    };

    // 立即执行一次
    pollTaskStatus();

    // 每2秒轮询一次
    pollingIntervalRef.current = setInterval(pollTaskStatus, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [taskId, navigate, mode, uploadedImages, selectedTemplate]);

  // 重试生成
  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    setProgress(0);
    setCurrentStage('识别人脸');

    try {
      // 重新调用生成API
      const response = await fetch(buildApiUrl(API_ENDPOINTS.GENERATE_ART_PHOTO), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '生成中国风全家福艺术照',
          imageUrls: uploadedImages,
          userId: userId,
          templateUrl: selectedTemplate,
          facePositions: null
        }),
      });

      if (!response.ok) {
        throw new Error('重新生成失败');
      }

      const result = await response.json();
      const newTaskId = result.data?.taskId;

      if (!newTaskId) {
        throw new Error('未获取到任务ID');
      }

      // 更新location state并重新开始轮询
      navigate('/generating', {
        state: {
          taskId: newTaskId,
          userId,
          mode,
          uploadedImages,
          selectedTemplate
        },
        replace: true
      });
    } catch (err) {
      console.error('重试失败:', err);
      setError('重试失败，请稍后再试');
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
        {/* 祥云装饰 */}
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
          AI家庭生成等待页
        </motion.h1>

        {/* 进度条 - 金色渐变 */}
        <div className="mb-6">
          <div className="relative">
            {/* 金色边框 */}
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
              <span className="text-lg">～ {currentStage}...{currentStage === '识别人脸' ? '福气满满' : currentStage === '调和光线' ? '光彩照人' : currentStage === '融合背景' ? '喜气洋洋' : currentStage === '优化细节' ? '精雕细琢' : '恭喜发财'} ～</span>
            </div>
          </motion.div>
        </div>

        {/* 队列提示 - 卷轴样式 */}
        <AnimatePresence>
          {queuePosition !== null && estimatedWaitTime !== null && !error && (
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
                  您的作品正在生成中，前面还有
                </p>
                <p className="text-center">
                  <span className="text-2xl font-bold text-[#D4302B]">{queuePosition}</span>
                  <span className="text-[#8B4513] ml-1">位在等待，请稍候...</span>
                </p>
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 查看案例按钮 - 老年模式下隐藏 */}
        {!error && queuePosition !== null && !isElderMode && (
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
            请保持页面打开，生成完成后将自动跳转
          </motion.p>
        )}
      </div>
      </div>
      </CornerBackground>
    </PageTransition>
  );
}
