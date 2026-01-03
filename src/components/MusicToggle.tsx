/**
 * 音乐开关组件
 * 显示在页面底部的音乐控制按钮
 */

import { motion } from 'framer-motion';
import { useMusic } from '@/contexts/MusicContext';

interface MusicToggleProps {
  className?: string;
}

export default function MusicToggle({ className = '' }: MusicToggleProps) {
  const { isMusicEnabled, toggleMusic, isPlaying } = useMusic();

  return (
    <motion.button
      onClick={toggleMusic}
      className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#D4302B] to-[#D4AF37] text-white shadow-lg flex items-center justify-center ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isMusicEnabled ? (
        <motion.div
          animate={isPlaying ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <i className="fas fa-music text-xl"></i>
        </motion.div>
      ) : (
        <i className="fas fa-music-slash text-xl"></i>
      )}
      
      {/* 音乐波纹效果 */}
      {isMusicEnabled && isPlaying && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
    </motion.button>
  );
}
