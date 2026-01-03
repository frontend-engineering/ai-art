import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useElderMode } from '@/contexts/ElderModeContext';
import { useUser } from '@/contexts/UserContext';
import FestivalGreeting from '@/components/FestivalGreeting';
import PageTransition from '@/components/PageTransition';

// 情感图片 - 3张轮播图
const emotionalImages = [
  {
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
    alt: '留守儿童盼望父母'
  },
  {
    url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
    alt: '异地视频通话'
  },
  {
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
    alt: 'AI全家福成品'
  }
];

export default function LaunchScreen() {
  const navigate = useNavigate();
  const { isElderMode } = useElderMode();
  const { user, loading } = useUser();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userCount] = useState(12345); // 动态数字，实际应从后端获取
  const [autoRedirect, setAutoRedirect] = useState(true);

  // 检查是否首次访问
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedLaunchScreen');
    if (hasVisited) {
      // 如果已经访问过，可以选择直接跳过或显示但不自动跳转
      // 这里我们选择显示但允许用户手动跳过
      // setAutoRedirect(false); // 取消注释此行可禁用自动跳转
    }
    
    // 标记已访问
    localStorage.setItem('hasVisitedLaunchScreen', 'true');
  }, []);

  // 自动轮播图片
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % emotionalImages.length);
    }, 1000); // 每1秒切换一次，3秒完成3张轮播

    return () => clearInterval(interval);
  }, []);

  // 3秒后自动跳转（确保用户已初始化）
  useEffect(() => {
    if (autoRedirect && !loading && user) {
      const timer = setTimeout(() => {
        navigate('/function-selector');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [autoRedirect, loading, user, navigate]);

  const handleSkip = () => {
    setAutoRedirect(false);
    navigate('/function-selector');
  };

  const handleStart = () => {
    navigate('/function-selector');
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#FFF8F0]">
      {/* 节气文案 */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <FestivalGreeting />
      </div>
      
      {/* 轮播图片背景 */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <img
              src={emotionalImages[currentImageIndex].url}
              alt={emotionalImages[currentImageIndex].alt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FFF8F0]" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 跳过按钮 - 老年模式下隐藏 */}
      {!isElderMode && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 text-gray-500 hover:text-gray-700 transition-colors text-base"
        >
          跳过
        </button>
      )}

      {/* 内容区域 */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* 主标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-[#D4302B] mb-4"
          style={{ fontFamily: '"HYShangWeiShouShuW", "PingFang SC", sans-serif' }}
        >
          这个春节，让爱没有距离
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg md:text-xl text-gray-700 mb-8"
        >
          3步生成惊艳全家的AI全家福
        </motion.p>

        {/* 动态数字 - 老年模式下隐藏 */}
        {!isElderMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mb-12"
          >
            <p className="text-base text-gray-600">
              已帮助{' '}
              <span className="text-2xl font-bold text-[#D4AF37]">
                {userCount.toLocaleString()}
              </span>{' '}
              个家庭团圆
            </p>
          </motion.div>
        )}

        {/* 立即制作按钮 */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          onClick={handleStart}
          className="w-40 h-12 bg-gradient-to-r from-[#D4302B] to-[#E84A3D] text-white text-lg font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ minWidth: '160px', minHeight: '48px' }}
        >
          立即制作
        </motion.button>
      </div>

      {/* 装饰元素 - 灯笼 - 老年模式下隐藏 */}
      {!isElderMode && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute top-10 left-10 text-6xl"
          >
            🏮
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1.2, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute top-10 right-10 text-6xl"
          >
            🏮
          </motion.div>
        </>
      )}
    </div>
    </PageTransition>
  );
}
