import { useState } from 'react';
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
  const { mode, uploadedImages, selectedTemplate, generatedImages, taskId } = location.state || {};
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFireworks, setShowFireworks] = useState(true);

  // 如果没有生成的图片，返回上传页
  if (!generatedImages || generatedImages.length === 0) {
    const targetPath = modeConfig ? `${modeConfig.slug}/upload` : '/upload';
    navigate(targetPath);
    return null;
  }

  const handleBack = () => {
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
        hasLivePhoto: false // 可以根据实际情况设置
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
          
          {/* 金币装饰 */}
          <motion.div
            className="absolute top-32 right-16 text-2xl opacity-30"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            🪙
          </motion.div>
        </div>
        
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 w-full backdrop-blur-sm bg-[#8B0000]/80 shadow-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBack} 
              className="flex items-center text-[#FFD700] font-medium hover:text-[#FFC700] transition-colors"
            >
              <i className="fas fa-arrow-left mr-1"></i>
              <span>返回</span>
            </button>
            <h1 className="text-xl font-bold text-[#FFD700]">
              {modeConfig?.name || '选择结果'}
            </h1>
            <div className="w-16"></div>
          </div>
        </header>

        <main className="flex-1 z-10 flex flex-col px-4 py-6">
          {/* 标题和说明 */}
          <motion.div
            className="mb-6 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.h2
              className="text-2xl font-bold text-[#FFD700] mb-2"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              🎉 生成完成！
            </motion.h2>
            <p className="text-white/90 text-base">
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

          {/* 底部提示 */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-white/70 text-sm">
              💡 点击图片可以放大查看细节
            </p>
          </motion.div>
        </main>
        </div>
      </CornerBackground>
    </PageTransition>
  );
}
