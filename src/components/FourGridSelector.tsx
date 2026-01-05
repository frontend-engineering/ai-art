import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface FourGridSelectorProps {
  images: string[];
  selectedImage: string | null;
  onSelect: (imageUrl: string) => void;
  onConfirm?: () => void;
  isLoading?: boolean;
}

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

  // 处理图片点击 - 打开预览
  const handleImageClick = (imageUrl: string, e: React.MouseEvent) => {
    // 如果点击的是选中标记，不打开预览
    if ((e.target as HTMLElement).closest('.select-badge')) {
      return;
    }
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
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
        {[1, 2, 3, 4].map((index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex flex-col items-center justify-center relative overflow-hidden"
          >
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
              className="text-4xl mb-2"
            >
              🏮
            </motion.div>
            
            <p className="text-gray-500 text-sm font-medium">生成中...</p>
            <p className="text-gray-400 text-xs mt-1">选项 {index + 1}</p>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-center"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          ✨ {images.length === 1 ? '您的生成结果' : '选择您最满意的一张'}
        </h3>
        <p className="text-sm text-gray-600">
          {images.length === 1 
            ? '点击图片查看大图，可以保存或重新生成' 
            : '点击图片进行选择，选中后可以保存或重新生成'}
        </p>
      </motion.div>
      
      <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-2'}`}>
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
            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-4 transition-all ${
              selectedImage === imageUrl
                ? 'border-[#D4302B] ring-4 ring-[#D4302B] ring-opacity-50 shadow-xl'
                : 'border-gray-200 hover:border-[#D4AF37] shadow-md hover:shadow-lg'
            }`}
            onClick={(e) => handleImageClick(imageUrl, e)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* 图片容器 - 带模糊到清晰效果 */}
            <div className="relative w-full h-full">
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
                    className="absolute inset-0 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-100"
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
                    className="absolute inset-0 flex items-center justify-center bg-gray-100"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-5xl"
                    >
                      🏮
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* 选中标记 - 带弹出动画 */}
            <AnimatePresence>
              {selectedImage === imageUrl && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                  className="select-badge absolute top-2 right-2 bg-[#D4302B] text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(imageUrl);
                  }}
                >
                  <motion.i 
                    className="fas fa-check text-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  />
                  <span className="text-xs font-bold">选中</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* 未选中时显示选择按钮 */}
            <AnimatePresence>
              {selectedImage !== imageUrl && revealStates[index] && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="select-badge absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md border border-gray-200 hover:bg-[#D4302B] hover:text-white hover:border-[#D4302B] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(imageUrl);
                  }}
                >
                  <i className="far fa-circle text-sm" />
                  <span className="text-xs font-medium">选择</span>
                </motion.button>
              )}
            </AnimatePresence>
            
            {/* 图片编号 - 淡入效果 */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: revealStates[index] ? 1 : 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              选项 {index + 1}
            </motion.div>
            
            {/* 悬停效果 */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            
            {/* 揭幕完成后的闪光效果 */}
            <AnimatePresence>
              {revealStates[index] && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 1, 0], scale: 1.2 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      
      {/* 提示信息 - 带滑入动画和自动隐藏 */}
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
            className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl text-center shadow-sm"
          >
            <motion.i 
              className="fas fa-check-circle text-green-600 mr-2 text-lg"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            />
            <span className="text-green-700 text-sm font-medium">
              已选中，您可以继续保存或重新生成
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 确认选择按钮 */}
      {onConfirm && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          disabled={!selectedImage}
          onClick={onConfirm}
          className={`mt-6 w-full py-4 rounded-xl font-bold text-lg transition-all ${
            selectedImage
              ? 'bg-gradient-to-r from-[#D4302B] to-[#B8261F] text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          whileHover={selectedImage ? { scale: 1.02 } : {}}
          whileTap={selectedImage ? { scale: 0.98 } : {}}
        >
          {selectedImage ? (
            <span className="flex items-center justify-center gap-2">
              <i className="fas fa-check-circle" />
              确认选择
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <i className="far fa-circle" />
              请先选择一张图片
            </span>
          )}
        </motion.button>
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
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm"
            >
              <i className="fas fa-search-plus mr-2" />
              滚轮缩放 | 双指缩放 | 拖拽移动
            </motion.div>

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
            <motion.div
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
