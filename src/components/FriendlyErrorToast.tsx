/**
 * 友好错误提示组件
 * 显示带emoji和解决方案的错误提示 - 春节喜庆风格
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { FriendlyError } from '@/lib/errorMessages';
import { useElderMode } from '@/contexts/ElderModeContext';

interface FriendlyErrorToastProps {
  error: FriendlyError | null;
  onClose: () => void;
  onRetry?: () => void; // 重试回调
  duration?: number; // 自动关闭时间（毫秒），0表示不自动关闭
}

export default function FriendlyErrorToast({ 
  error, 
  onClose,
  onRetry,
  duration = 5000 
}: FriendlyErrorToastProps) {
  const { isElderMode } = useElderMode();
  
  // 自动关闭
  if (error && duration > 0) {
    setTimeout(() => {
      onClose();
    }, duration);
  }

  const handleAction = () => {
    if (error?.retryable && onRetry) {
      onRetry();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {error && (
        <>
          {/* 遮罩层 */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* 错误提示卡片 */}
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] max-w-md w-full mx-4"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
          >
            <div 
              className="bg-gradient-to-b from-[#FFF8F0] to-white rounded-2xl shadow-2xl overflow-hidden relative"
              style={{
                border: '2px solid #D4302B',
                boxShadow: '0 20px 60px rgba(212, 48, 43, 0.25)'
              }}
            >
              {/* 顶部装饰条 - 红金渐变 */}
              <div 
                className="h-1.5"
                style={{
                  background: 'linear-gradient(90deg, #D4302B 0%, #FFD700 50%, #D4302B 100%)'
                }}
              />
              
              {/* 顶部装饰元素 */}
              <div className="absolute top-3 left-3 text-xl opacity-50">🧧</div>
              <div className="absolute top-3 right-10 text-xl opacity-50">🧧</div>
              
              <div className={`p-6 pt-8 ${isElderMode ? 'p-8 pt-10' : 'p-6 pt-8'}`}>
                {/* 关闭按钮 */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all"
                  style={{ fontSize: isElderMode ? '18px' : '16px' }}
                >
                  ✕
                </button>

                {/* Emoji */}
                <motion.div 
                  className="text-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.1,
                    type: 'spring',
                    stiffness: 200
                  }}
                >
                  <span 
                    className="inline-block"
                    style={{ fontSize: isElderMode ? '72px' : '56px' }}
                  >
                    {error.emoji}
                  </span>
                </motion.div>

                {/* 标题 */}
                <h3 
                  className="font-bold text-[#D4302B] text-center mb-3"
                  style={{ 
                    fontSize: isElderMode ? '24px' : '20px',
                    lineHeight: '1.3'
                  }}
                >
                  {error.title}
                </h3>

                {/* 消息 */}
                <p 
                  className="text-gray-600 text-center mb-4"
                  style={{ 
                    fontSize: isElderMode ? '18px' : '15px',
                    lineHeight: '1.6'
                  }}
                >
                  {error.message}
                </p>

                {/* 解决方案 - 春节风格 */}
                <motion.div 
                  className="bg-gradient-to-br from-[#FFF8DC] to-[#FFFBEB] rounded-xl p-4 border-2 border-[#D4AF37]/30 mb-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-start">
                    <span 
                      className="mr-3 flex-shrink-0"
                      style={{ fontSize: isElderMode ? '28px' : '22px' }}
                    >
                      💡
                    </span>
                    <div className="flex-1">
                      <p 
                        className="font-medium text-[#8B4513] mb-1"
                        style={{ fontSize: isElderMode ? '16px' : '13px' }}
                      >
                        解决方案
                      </p>
                      <p 
                        className="text-[#A0522D]"
                        style={{ 
                          fontSize: isElderMode ? '16px' : '13px',
                          lineHeight: '1.6'
                        }}
                      >
                        {error.solution}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* 操作按钮 */}
                <div className="flex gap-3 justify-center">
                  {error.retryable && onRetry && (
                    <motion.button
                      onClick={handleAction}
                      className="px-6 py-3 bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                      style={{ 
                        fontSize: isElderMode ? '18px' : '15px',
                        minWidth: isElderMode ? '130px' : '110px',
                        minHeight: isElderMode ? '52px' : '44px'
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {error.actionText || '🔄 重试'}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={onClose}
                    className="px-6 py-3 bg-white text-gray-600 rounded-xl font-medium border-2 border-gray-200 hover:bg-gray-50 transition-all"
                    style={{ 
                      fontSize: isElderMode ? '18px' : '15px',
                      minWidth: isElderMode ? '130px' : '110px',
                      minHeight: isElderMode ? '52px' : '44px'
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    我知道了
                  </motion.button>
                </div>
              </div>
              
              {/* 底部装饰 */}
              <div 
                className="h-1"
                style={{
                  background: 'linear-gradient(90deg, #D4302B 0%, #FFD700 50%, #D4302B 100%)'
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
