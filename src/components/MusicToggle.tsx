/**
 * 音乐开关组件
 * 中国风设计，带有明确的音乐图标
 */

import { motion } from 'framer-motion';
import { useMusic } from '@/contexts/MusicContext';

interface MusicToggleProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function MusicToggle({ 
  className = '', 
  position = 'bottom-right' 
}: MusicToggleProps) {
  const { isMusicEnabled, toggleMusic, isPlaying } = useMusic();

  const positionStyles = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
  };

  return (
    <motion.button
      onClick={toggleMusic}
      className={`fixed ${positionStyles[position]} z-40 group ${className}`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      aria-label={isMusicEnabled ? '关闭背景音乐' : '开启背景音乐'}
    >
      <div className="relative">
        {/* 主按钮 - 中国风圆形边框 */}
        <div className={`
          relative w-14 h-14 sm:w-16 sm:h-16 rounded-full
          bg-gradient-to-br from-[#8B0000] via-[#D4302B] to-[#B8860B]
          shadow-lg
          flex items-center justify-center
          border-2 border-[#D4AF37]/60
          ${!isMusicEnabled ? 'opacity-75 grayscale-[30%]' : ''}
        `}>
          {/* 内圈装饰 - 中国风纹样 */}
          <div className="absolute inset-1.5 rounded-full border border-[#D4AF37]/40" />
          
          {/* 音乐图标区域 */}
          <div className="relative flex items-center justify-center">
            {isMusicEnabled ? (
              <>
                {/* 音符图标 */}
                <motion.div
                  animate={isPlaying ? { y: [0, -2, 0] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-md"
                    fill="currentColor"
                  >
                    {/* 双音符图标 */}
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </motion.div>

                {/* 播放时的音波效果 */}
                {isPlaying && (
                  <div className="absolute -right-1 top-0 flex flex-col gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-[#D4AF37] rounded-full"
                        animate={{ 
                          height: ['3px', '8px', '3px'],
                          opacity: [0.6, 1, 0.6]
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.12,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* 静音状态 - 带斜线的音符 */
              <div className="relative">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-6 h-6 sm:w-7 sm:h-7 text-white/70"
                  fill="currentColor"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                {/* 斜线表示关闭 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-white/80 rotate-45 rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 播放状态光晕 */}
        {isMusicEnabled && isPlaying && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/50"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#D4302B]/40"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </>
        )}

        {/* 状态文字标签 */}
        <div className={`
          absolute -bottom-1 left-1/2 transform -translate-x-1/2
          px-1.5 py-0.5 rounded text-[10px] font-medium
          whitespace-nowrap
          ${isMusicEnabled 
            ? 'bg-[#D4AF37] text-[#8B0000]' 
            : 'bg-gray-500 text-white'
          }
        `}>
          {isMusicEnabled ? (isPlaying ? '播放中' : '已暂停') : '已静音'}
        </div>
      </div>

      {/* Hover 提示 */}
      <div className="
        absolute right-full mr-3 top-1/2 transform -translate-y-1/2
        px-2.5 py-1.5 rounded-lg
        bg-gray-900/95 text-white text-xs whitespace-nowrap
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none
        hidden sm:block
        shadow-lg
      ">
        <span className="flex items-center gap-1.5">
          <span>🎵</span>
          <span>{isMusicEnabled ? '点击关闭音乐' : '点击开启音乐'}</span>
        </span>
      </div>
    </motion.button>
  );
}
