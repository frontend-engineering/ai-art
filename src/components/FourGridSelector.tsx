import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface FourGridSelectorProps {
  images: string[];
  selectedImage: string | null;
  onSelect: (imageUrl: string) => void;
  onConfirm?: () => void;
  isLoading?: boolean;
}

// 中国风边框装饰组件
const ChineseFrameCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const rotations = {
    tl: 'rotate-0',
    tr: 'rotate-90',
    br: 'rotate-180',
    bl: '-rotate-90'
  };
  const positions = {
    tl: 'top-0 left-0',
    tr: 'top-0 right-0',
    bl: 'bottom-0 left-0',
    br: 'bottom-0 right-0'
  };
  
  return (
    <div className={`absolute ${positions[position]} w-10 h-10 sm:w-12 sm:h-12 ${rotations[position]} pointer-events-none z-20`}>
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path
          d="M0 0 L0 14 L3 14 L3 3 L14 3 L14 0 Z"
          fill="#FFD700"
        />
        <path
          d="M1 1 L1 12 L4 12 L4 4 L12 4 L12 1 Z"
          fill="#C41E3A"
        />
      </svg>
    </div>
  );
};

// 中国风图片边框组件
const ChineseImageFrame = ({ children, isSelected }: { children: React.ReactNode; isSelected: boolean }) => {
  return (
    <div className="relative">
      {/* 内容区域 */}
      <div className="relative rounded-md overflow-hidden bg-white">
        {children}
      </div>
      
      {/* 边框覆盖层 - 在图片上面 */}
      <div className="absolute inset-0 pointer-events-none rounded-md">
        {/* 金色边框 */}
        <div className={`absolute inset-0 rounded-md border-4 sm:border-[6px] transition-all duration-300 ${
          isSelected 
            ? 'border-[#FFD700] shadow-xl shadow-[#FFD700]/50' 
            : 'border-[#D4AF37]'
        }`} />
        
        {/* 内层红色边框 */}
        <div className={`absolute inset-1 sm:inset-1.5 rounded-sm border-2 sm:border-[3px] transition-all duration-300 ${
          isSelected 
            ? 'border-[#C41E3A]' 
            : 'border-[#8B0000]'
        }`} />
      </div>
      
      {/* 四角装饰 - 最上层 */}
      <ChineseFrameCorner position="tl" />
      <ChineseFrameCorner position="tr" />
      <ChineseFrameCorner position="bl" />
      <ChineseFrameCorner position="br" />
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
  // 预览模态框状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // 缩放状态
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // 提示信息显示状态
  const [showHint, setShowHint] = useState(true);

  // 当图片URL改变时，重置状态
  useEffect(() => {
    if (images.length > 0) {
      setImageLoadStates([false, false, false, false]);
      setRevealStates([false, false, false, false]);
    }
  }, [images]);

  // 重置预览状态
  useEffect(() => {
    if (!previewImage) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [previewImage]);

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
  const handleImageClick = (imageUrl: string, e: React.MouseEvent) => {
    // 如果点击的是预览按钮，不选择
    if ((e.target as HTMLElement).closest('.preview-btn')) {
      return;
    }
    // 直接选择图片
    onSelect(imageUrl);
  };

  // 处理预览按钮点击
  const handlePreviewClick = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImage(imageUrl);
  };

  // 处理滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(1, Math.min(4, prev + delta)));
  };

  // 处理触摸缩放
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      (e.currentTarget as any).initialPinchDistance = distance;
      (e.currentTarget as any).initialScale = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const initialDistance = (e.currentTarget as any).initialPinchDistance;
      const initialScale = (e.currentTarget as any).initialScale || 1;
      
      if (initialDistance) {
        const newScale = (distance / initialDistance) * initialScale;
        setScale(Math.max(1, Math.min(4, newScale)));
      }
    }
  };

  // 处理拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
            <ChineseImageFrame isSelected={false}>
              <div className="aspect-square bg-gradient-to-br from-[#FFF8DC] to-[#F4E4C1] flex flex-col items-center justify-center relative overflow-hidden">
                {/* 闪烁背景效果 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                
                {/* 旋转灯笼图标 */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl sm:text-4xl mb-2"
                >
                  🏮
                </motion.div>
                
                <p className="text-[#8B4513] text-xs sm:text-sm font-medium">生成中...</p>
                <p className="text-[#8B4513]/60 text-xs mt-1">选项 {index}</p>
              </div>
            </ChineseImageFrame>
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
        className="mb-3 sm:mb-4 text-center"
      >
        <h3 className="text-base sm:text-lg font-semibold text-[#FFD700] mb-1 sm:mb-2">
          ✨ {images.length === 1 ? '您的生成结果' : '选择您最满意的一张'}
        </h3>
        <p className="text-xs sm:text-sm text-white/80">
          {images.length === 1 
            ? '点击图片查看大图，可以保存或重新生成' 
            : '点击图片进行选择，选中后可以保存或重新生成'}
        </p>
      </motion.div>
      
      <div className={`grid gap-4 sm:gap-5 ${images.length === 1 ? 'grid-cols-1 max-w-xs sm:max-w-md mx-auto' : 'grid-cols-2'}`}>
        {images.map((imageUrl, index) => (
          <motion.div
            key={`${imageUrl}-${index}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.15,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            onClick={(e) => handleImageClick(imageUrl, e)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer relative"
          >
            <ChineseImageFrame isSelected={selectedImage === imageUrl}>
              {/* 图片容器 - 带模糊到清晰效果 */}
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
                  transition={{ 
                    duration: 0.8,
                    ease: "easeOut"
                  }}
                  onLoad={() => handleImageLoad(index)}
                />
                
                {/* 揭幕效果 - 从上到下的渐变遮罩 */}
                <AnimatePresence>
                  {!revealStates[index] && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-[#F4E4C1] via-[#FFF8DC] to-[#F4E4C1]"
                      initial={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ 
                        duration: 0.8,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                    >
                      {/* 闪光效果 */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* 加载中的旋转灯笼 */}
                <AnimatePresence>
                  {!imageLoadStates[index] && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-[#FFF8DC]"
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
                
                {/* 图片编号 - 淡入效果 */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: revealStates[index] ? 1 : 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-2 left-2 bg-[#8B0000]/80 text-[#FFD700] text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-sm border border-[#D4AF37]/50"
                >
                  选项 {index + 1}
                </motion.div>
                
                {/* 预览按钮 */}
                <button
                  className="preview-btn absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                  onClick={(e) => handlePreviewClick(imageUrl, e)}
                >
                  <i className="fas fa-search-plus mr-1" />
                  放大
                </button>
                
                {/* 选中遮罩 */}
                {selectedImage === imageUrl && (
                  <div className="absolute inset-0 bg-[#D4302B]/20 pointer-events-none" />
                )}
              </div>
            </ChineseImageFrame>
            
            {/* 选中标记 - 始终显示在右上角 */}
            <div className="absolute -top-1 -right-1 z-20">
              {selectedImage === imageUrl ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-[#D4302B] text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg border-2 border-[#FFD700]"
                >
                  <i className="fas fa-check text-sm sm:text-base" />
                </motion.div>
              ) : (
                <div className="bg-white text-[#8B4513] rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg border-2 border-[#D4AF37] hover:bg-[#FFF8DC] transition-colors">
                  <i className="far fa-circle text-sm sm:text-base" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 提示信息 - 中国风卷轴样式 */}
      <AnimatePresence>
        {selectedImage && showHint && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-[#F4E4C1] via-[#FFF8DC] to-[#F4E4C1] border-2 border-[#D4AF37] rounded-lg text-center shadow-md relative"
          >
            {/* 装饰角 */}
            <div className="absolute top-1 left-1 text-[#D4AF37] text-xs">🎋</div>
            <div className="absolute top-1 right-1 text-[#D4AF37] text-xs">🎋</div>
            
            <motion.i 
              className="fas fa-check-circle text-[#D4302B] mr-2 text-base sm:text-lg"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            />
            <span className="text-[#8B4513] text-xs sm:text-sm font-medium">
              已选中，您可以继续保存或重新生成
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 确认选择按钮 - 中国风样式 */}
      {onConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 sm:mt-6"
        >
          <button
            disabled={!selectedImage}
            onClick={onConfirm}
            className={`relative w-full overflow-hidden transition-all ${
              selectedImage ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
          >
            {/* 外层金色边框 */}
            <div className={`absolute inset-0 rounded-full transition-all ${
              selectedImage 
                ? 'bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5' 
                : 'bg-gradient-to-r from-gray-400 to-gray-500 p-0.5'
            }`} />
            
            {/* 按钮主体 */}
            <div className={`relative h-11 sm:h-14 rounded-full flex items-center justify-center transition-all ${
              selectedImage
                ? 'bg-gradient-to-r from-[#D4302B] to-[#B8261F] hover:from-[#B8261F] hover:to-[#D4302B]'
                : 'bg-gray-300'
            }`}>
              {/* 装饰纹理 */}
              {selectedImage && (
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
                </div>
              )}
              
              <span className={`relative z-10 text-sm sm:text-lg font-bold flex items-center justify-center gap-2 ${
                selectedImage ? 'text-[#FFD700]' : 'text-gray-500'
              }`}>
                {selectedImage ? (
                  <>
                    <i className="fas fa-check-circle" />
                    确认选择
                  </>
                ) : (
                  <>
                    <i className="far fa-circle" />
                    请先选择一张图片
                  </>
                )}
              </span>
            </div>
          </button>
        </motion.div>
      )}

      {/* 图片预览模态框 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            {/* 关闭按钮 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-sm text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <i className="fas fa-times text-xl" />
            </motion.button>

            {/* 缩放提示 */}
            {/* <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm"
            >
              <i className="fas fa-search-plus mr-2" />
              滚轮缩放 | 双指缩放 | 拖拽移动
            </motion.div> */}

            {/* 图片容器 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              <motion.img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain select-none"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
                draggable={false}
              />
            </motion.div>

            {/* 缩放控制按钮 */}
            {/* <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/10 backdrop-blur-sm rounded-full p-2"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScale(prev => Math.max(1, prev - 0.5));
                }}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                disabled={scale <= 1}
              >
                <i className="fas fa-minus" />
              </button>
              <div className="bg-white/20 text-white rounded-full px-4 py-2 flex items-center justify-center min-w-[80px]">
                {Math.round(scale * 100)}%
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScale(prev => Math.min(4, prev + 0.5));
                }}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                disabled={scale >= 4}
              >
                <i className="fas fa-plus" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 flex items-center justify-center transition-colors ml-2"
              >
                <i className="fas fa-redo mr-2" />
                重置
              </button>
            </motion.div> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
