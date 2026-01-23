import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import lanternImg from '../assets/lantern.png';

interface ImageWithLoadingProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  loadingSize?: 'sm' | 'md' | 'lg';
  showLoadingText?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function ImageWithLoading({
  src,
  alt,
  className = '',
  containerClassName = '',
  loadingSize = 'md',
  showLoadingText = true,
  onLoad,
  onError
}: ImageWithLoadingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sizeMap = {
    sm: { width: '40px', height: '40px' },
    md: { width: '60px', height: '60px' },
    lg: { width: '100px', height: '100px' }
  } as const;

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {/* 加载中状态 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF8DC] to-[#F4E4C1] z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 闪烁背景效果 */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* 旋转灯笼图片 */}
            <div className="flex items-center justify-center" style={sizeMap[loadingSize]}>
              <img 
                src={lanternImg}
                alt="loading"
                className="animate-lantern-spin"
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center'
                }}
              />
            </div>
            
            {showLoadingText && (
              <p className="text-[#8B4513] text-sm font-medium mt-2">加载中...</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF8DC] to-[#F4E4C1]">
          <div className="text-4xl mb-2">😢</div>
          <p className="text-[#8B4513] text-sm">图片加载失败</p>
        </div>
      )}

      {/* 实际图片 */}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
