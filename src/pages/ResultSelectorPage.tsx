import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import FourGridSelector from '@/components/FourGridSelector';
import PageTransition from '@/components/PageTransition';
import CornerBackground from '@/components/CornerBackground';
import { useModeConfig } from '@/hooks/useModeConfig';
import FireworksAnimation from '@/components/FireworksAnimation';

export default function ResultSelectorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const modeConfig = useModeConfig();
  const { mode, uploadedImages, generatedImages, taskId, fromHistory } = location.state || {};
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFireworks, setShowFireworks] = useState(true);

  // 如果没有生成的图片，根据来源返回不同页面
  useEffect(() => {
    if (!generatedImages || generatedImages.length === 0) {
      // 如果是从历史记录进入但没有数据，返回模式首页
      if (fromHistory) {
        const targetPath = modeConfig ? modeConfig.slug : '/';
        navigate(targetPath, { replace: true });
      } else {
        // 否则返回上传页
        const targetPath = modeConfig ? `${modeConfig.slug}/upload` : '/upload';
        navigate(targetPath, { replace: true });
      }
    }
  }, [generatedImages, modeConfig, navigate, fromHistory]);

  // 如果只有一张图片，自动选中
  useEffect(() => {
    if (generatedImages && generatedImages.length === 1 && !selectedImage) {
      setSelectedImage(generatedImages[0]);
    }
  }, [generatedImages, selectedImage]);

  // 如果没有数据，显示加载状态而不是直接返回 null
  if (!generatedImages || generatedImages.length === 0) {
    return (
      <PageTransition>
        <CornerBackground>
          <div className="min-h-screen w-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-4xl mb-4">🏮</div>
              <p>正在加载...</p>
            </div>
          </div>
        </CornerBackground>
      </PageTransition>
    );
  }

  const handleBack = () => {
    // 如果是从历史记录进入的，返回到模式首页
    if (fromHistory) {
      const targetPath = modeConfig ? modeConfig.slug : '/';
      navigate(targetPath);
      return;
    }
    
    // 否则返回到模板选择页
    const targetPath = modeConfig ? `${modeConfig.slug}/template` : '/template';
    navigate(targetPath, { 
      state: { mode, uploadedImages } 
    });
  };

  const handleSelectImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    
    // 触发震动反馈
    if ('vibrate' in navigator) {
      (navigator as any).vibrate(50);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedImage) {
      toast.error('请先选择一张图片');
      return;
    }

    // 创建历史记录项
    const historyItem = {
      id: taskId || Date.now().toString(),
      originalImages: uploadedImages || [],
      generatedImage: selectedImage,
      createdAt: new Date().toISOString(),
      isPaid: false,
      regenerateCount: 3,
      mode: mode
    };

    // 保存到 localStorage
    try {
      const savedHistory = localStorage.getItem('artPhotoHistory');
      const history = savedHistory ? JSON.parse(savedHistory) : [];
      const updatedHistory = [historyItem, ...history].slice(0, 10); // 最多保存10条
      localStorage.setItem('artPhotoHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }

    // 跳转到成果页
    const targetPath = modeConfig ? `${modeConfig.slug}/result` : '/result';
    navigate(targetPath, {
      state: {
        selectedImage,
        historyItem,
        hasLivePhoto: false, // 可以根据实际情况设置
        fromHistory // 传递历史记录标记
      }
    });
  };

  return (
    <PageTransition>
      <CornerBackground>
        <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
          {/* 烟花动画 */}
          <FireworksAnimation 
            isVisible={showFireworks}
            onComplete={() => setShowFireworks(false)} 
          />

          {/* 装饰背景元素 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-24 left-8 text-2xl opacity-20"
              animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              🏮
            </motion.div>
            <motion.div
              className="absolute bottom-32 right-8 text-2xl opacity-20"
              animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              🏮
            </motion.div>
            <motion.div
              className="absolute top-1/3 right-12 text-xl opacity-15"
              animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              ✨
            </motion.div>
          </div>
          
          {/* 顶部导航栏 */}
          <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-[#8B0000]/90 shadow-lg px-4 py-3 border-b border-[#D4AF37]/30">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <button 
                onClick={handleBack} 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 text-[#FFD700] hover:bg-black/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-[#FFD700] drop-shadow-sm">
                {modeConfig?.name || '选择结果'}
              </h1>
              <div className="w-10" />
            </div>
          </header>

          <main className="flex-1 z-10 flex flex-col px-4 py-5">
            {/* 标题和说明 */}
            <motion.div
              className="mb-5 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.h2
                className="text-2xl font-bold text-[#FFD700] mb-2"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                🎉 生成完成！
              </motion.h2>
              <p className="text-white/80 text-sm">
                请选择您最满意的一张作品
              </p>
            </motion.div>

            {/* 4宫格选择器 */}
            <div className="flex-1 flex items-center justify-center">
              <FourGridSelector
                images={generatedImages}
                selectedImage={selectedImage}
                onSelect={handleSelectImage}
                onConfirm={handleConfirmSelection}
              />
            </div>
          </main>
        </div>
      </CornerBackground>
    </PageTransition>
  );
}
