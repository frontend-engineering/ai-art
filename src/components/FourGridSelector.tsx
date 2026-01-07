import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface FourGridSelectorProps {
  images: string[];
  selectedImage: string | null;
  onSelect: (imageUrl: string) => void;
  onConfirm?: () => void;
  isLoading?: boolean;
}

// 简化的中国风图片边框组件
const ChineseImageFrame = ({ children, isSelected }: { children: React.ReactNode; isSelected: boolean }) => {
  return (
    <div className="relative">
      {/* 外层金色光晕 - 选中时显示 */}
      {isSelected && (
        <motion.div 
          className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] opacity-80"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* 主边框 */}
      <div className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
        isSelected 
          ? 'ring-2 ring-[#FFD700] shadow-lg shadow-[#FFD700]/30' 
          : 'ring-1 ring-[#D4AF37]/50 hover:ring-[#D4AF37]'
      }`}>
        {/* 内容区域 */}
        <div className="relative bg-[#FFF8DC]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function FourGridSelector({ 
  images, 
  selectedImage, 
  onSelect,
  onConfirm,
  isLoading = false 
}: FourGridSelectorProps) {
  // 跟踪每张图片的加载状态
  const [imageLoadStates, setImageLoadStates] = useState<boolean[]>([false, false, false, false]);
  // 跟踪揭幕动画状态
  const [revealStates, setRevealStates] = useState<boolean[]>([false, false, false, false]);
  // 提示信息显示状态
  const [showHint, setShowHint] = useState(true);

  // 当图片URL改变时，重置状态
  useEffect(() => {
    if (images.length > 0) {
      setImageLoadStates([false, false, false, false]);
      setRevealStates([false, false, false, false]);
    }
  }, [images]);

  // 选中图片后自动隐藏提示信息
  useEffect(() => {
    if (selectedImage) {
      setShowHint(true);
      const timer = setTimeout(() => {
        setShowHint(false);
      }, 3000); // 3秒后自动隐藏

      return () => clearTimeout(timer);
    }
  }, [selectedImage]);

  // 处理图片加载完成
  const handleImageLoad = (index: number) => {
    setImageLoadStates(prev => {
      const newStates = [...prev];
      newStates[index] = true;
      return newStates;
    });
    
    // 图片加载完成后，延迟启动揭幕动画
    setTimeout(() => {
      setRevealStates(prev => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });
    }, 100);
  };

  // 处理图片点击 - 直接选择图片
  const handleImageClick = (imageUrl: string) => {
    onSelect(imageUrl);
  };

  // 如果正在加载或没有图片，显示加载状态
  if (isLoading || images.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-sm sm:max-w-2xl mx-auto px-2 sm:px-0">
        {[1, 2, 3, 4].map((index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="relative rounded-xl overflow-hidden ring-1 ring-[#D4AF37]/50">
              <div className="aspect-square bg-gradient-to-br from-[#8B0000]/90 to-[#6B0000]/90 flex flex-col items-center justify-center relative overflow-hidden">
                {/* 闪烁背景效果 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                
                {/* 旋转灯笼图标 */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl sm:text-4xl mb-2"
                >
                  🏮
                </motion.div>
                
                <p className="text-[#FFD700] text-xs sm:text-sm font-medium">生成中...</p>
                <p className="text-[#FFD700]/60 text-xs mt-1">选项 {index}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm sm:max-w-2xl mx-auto px-2 sm:px-0">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-center"
      >
        <h3 className="text-lg sm:text-xl font-bold text-[#FFD700] mb-1">
          {images.length === 1 ? '🎊 您的生成结果' : '🎊 选择您最满意的一张'}
        </h3>
        <p className="text-xs sm:text-sm text-white/80">
          {images.length === 1 
            ? '点击确认后可以保存或重新生成' 
            : '点击图片进行选择'}
        </p>
      </motion.div>
      
      <div className={`grid gap-3 sm:gap-4 ${images.length === 1 ? 'grid-cols-1 max-w-xs sm:max-w-sm mx-auto' : 'grid-cols-2'}`}>
        {images.map((imageUrl, index) => (
          <motion.div
            key={`${imageUrl}-${index}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            onClick={() => handleImageClick(imageUrl)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer relative"
          >
            <ChineseImageFrame isSelected={selectedImage === imageUrl}>
              {/* 图片容器 */}
              <div className="relative w-full aspect-square">
                <motion.img
                  src={imageUrl}
                  alt={`Generated option ${index + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ filter: 'blur(20px)', scale: 1.1 }}
                  animate={{ 
                    filter: revealStates[index] ? 'blur(0px)' : 'blur(20px)',
                    scale: revealStates[index] ? 1 : 1.1
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  onLoad={() => handleImageLoad(index)}
                />
                
                {/* 揭幕效果遮罩 */}
                <AnimatePresence>
                  {!revealStates[index] && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-[#8B0000] to-[#6B0000]"
                      initial={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* 加载中状态 */}
                <AnimatePresence>
                  {!imageLoadStates[index] && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#8B0000] to-[#6B0000]"
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="text-4xl sm:text-5xl"
                      >
                        🏮
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* 图片编号标签 */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: revealStates[index] ? 1 : 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-2 left-2 bg-[#8B0000]/90 text-[#FFD700] text-xs px-2.5 py-1 rounded-full backdrop-blur-sm border border-[#D4AF37]/30 font-medium"
                >
                  选项 {index + 1}
                </motion.div>
                
                {/* 选中遮罩 */}
                {selectedImage === imageUrl && (
                  <motion.div 
                    className="absolute inset-0 bg-[#D4302B]/10 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </div>
            </ChineseImageFrame>
            
            {/* 选中标记 */}
            <div className="absolute -top-1.5 -right-1.5 z-20">
              {selectedImage === imageUrl ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#D4302B] to-[#8B0000] rounded-full flex items-center justify-center shadow-lg border-2 border-[#FFD700]"
                >
                  <svg className="w-4 h-4 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md border-2 border-[#D4AF37]/50 hover:border-[#D4AF37] transition-colors">
                  <div className="w-3 h-3 rounded-full border-2 border-[#D4AF37]/50" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 提示信息 */}
      <AnimatePresence>
        {selectedImage && showHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-4 p-3 bg-gradient-to-r from-[#8B0000]/80 to-[#6B0000]/80 backdrop-blur-sm border border-[#D4AF37]/30 rounded-xl text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              >
                <svg className="w-5 h-5 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <span className="text-[#FFD700] text-sm font-medium">
                已选中，点击下方按钮确认
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 确认选择按钮 */}
      {onConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5"
        >
          <button
            disabled={!selectedImage}
            onClick={onConfirm}
            className={`relative w-full h-12 sm:h-14 rounded-full overflow-hidden transition-all ${
              selectedImage ? 'cursor-pointer active:scale-[0.98]' : 'cursor-not-allowed opacity-60'
            }`}
          >
            {selectedImage ? (
              <>
                {/* 金色外边框 */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                  <div className="w-full h-full bg-gradient-to-r from-[#D4302B] to-[#8B0000] rounded-full flex items-center justify-center">
                    <span className="text-[#FFD700] text-base sm:text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      确认选择
                    </span>
                  </div>
                </div>
                {/* 光效动画 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </>
            ) : (
              <div className="w-full h-full bg-gray-500/50 rounded-full flex items-center justify-center">
                <span className="text-white/70 text-base sm:text-lg font-medium">
                  请先选择一张图片
                </span>
              </div>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
