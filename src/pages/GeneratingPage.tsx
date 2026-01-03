import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Background from '../components/Background';
import { useElderMode } from '@/contexts/ElderModeContext';
import PageTransition from '@/components/PageTransition';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/apiConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 进度阶段配置
const PROGRESS_STAGES = [
  { progress: 20, text: '识别人脸' },
  { progress: 40, text: '调和光线' },
  { progress: 60, text: '融合背景' },
  { progress: 80, text: '优化细节' },
  { progress: 100, text: '完成' }
];

// 灯笼SVG组件
const LanternIcon = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 顶部装饰 */}
    <rect x="35" y="8" width="10" height="4" fill="#D4AF37" rx="1" />
    
    {/* 灯笼主体 */}
    <ellipse cx="40" cy="20" rx="8" ry="4" fill="#D4302B" />
    <path d="M32 20 L32 50 Q32 55 40 55 Q48 55 48 50 L48 20" fill="#D4302B" />
    <ellipse cx="40" cy="50" rx="8" ry="4" fill="#8B0000" />
    
    {/* 灯笼纹理 */}
    <line x1="32" y1="28" x2="48" y2="28" stroke="#FFD700" strokeWidth="0.5" opacity="0.6" />
    <line x1="32" y1="35" x2="48" y2="35" stroke="#FFD700" strokeWidth="0.5" opacity="0.6" />
    <line x1="32" y1="42" x2="48" y2="42" stroke="#FFD700" strokeWidth="0.5" opacity="0.6" />
    
    {/* 福字 */}
    <text x="40" y="38" fontSize="12" fill="#FFD700" textAnchor="middle" fontWeight="bold">福</text>
    
    {/* 底部流苏 */}
    <line x1="40" y1="54" x2="40" y2="62" stroke="#D4AF37" strokeWidth="2" />
    <circle cx="40" cy="64" r="3" fill="#D4AF37" />
    <line x1="40" y1="64" x2="37" y2="70" stroke="#D4AF37" strokeWidth="1.5" />
    <line x1="40" y1="64" x2="40" y2="72" stroke="#D4AF37" strokeWidth="1.5" />
    <line x1="40" y1="64" x2="43" y2="70" stroke="#D4AF37" strokeWidth="1.5" />
  </svg>
);

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
            navigate('/generator', {
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-4">
      <Background />
      
      <div className="z-10 w-full max-w-md">
        {/* 旋转灯笼动画 */}
        <motion.div
          className="flex justify-center mb-8"
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <LanternIcon />
        </motion.div>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#D4302B] to-[#D4AF37]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* 进度百分比和文案 */}
          <motion.div
            className="mt-3 text-center"
            key={currentStage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-2xl font-bold text-[#D4302B] mb-1">
              {Math.round(progress)}%
            </p>
            <p className="text-lg text-gray-700">
              {currentStage}
            </p>
          </motion.div>
        </div>

        {/* 队列提示 */}
        <AnimatePresence>
          {queuePosition !== null && estimatedWaitTime !== null && !error && (
            <motion.div
              className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <p className="text-gray-700 mb-2">
                您前面还有 <span className="text-[#D4302B] font-bold">{queuePosition}</span> 位用户
              </p>
              <p className="text-gray-600 text-sm">
                预计等待 <span className="font-semibold">{estimatedWaitTime}</span> 秒
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-red-600 mb-2">生成失败</h3>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-gradient-to-r from-[#D4302B] to-[#B8251F] text-white py-3 px-6 rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? '重试中...' : '点击重试'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 查看案例按钮 - 老年模式下隐藏 */}
        {!error && queuePosition !== null && !isElderMode && (
          <motion.button
            onClick={handleViewExamples}
            className="w-full mt-4 bg-white/60 backdrop-blur-sm text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-white/80 transition-all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            先看别人的作品
          </motion.button>
        )}

        {/* 温馨提示 */}
        {!error && (
          <motion.p
            className="mt-6 text-center text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            请保持页面打开，生成完成后将自动跳转
          </motion.p>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
