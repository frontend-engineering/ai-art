/**
 * 友好错误提示组件
 * 显示带emoji和解决方案的错误提示
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
            className="fixed inset-0 bg-black/30 z-[100]"
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
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{
                border: '3px solid #D4302B',
                boxShadow: '0 20px 60px rgba(212, 48, 43, 0.3)'
              }}
            >
              {/* 顶部装饰条 */}
              <div 
                className="h-2"
                style={{
                  background: 'linear-gradient(90deg, #D4302B 0%, #E84A3D 100%)'
                }}
              />
              
              <div className={`p-6 ${isElderMode ? 'p-8' : 'p-6'}`}>
                {/* 关闭按钮 */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ fontSize: isElderMode ? '24px' : '20px' }}
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
                    style={{ fontSize: isElderMode ? '80px' : '64px' }}
                  >
                    {error.emoji}
                  </span>
                </motion.div>

                {/* 标题 */}
                <h3 
                  className="font-bold text-gray-800 text-center mb-3"
                  style={{ 
                    fontSize: isElderMode ? '26px' : '22px',
                    lineHeight: '1.3'
                  }}
                >
                  {error.title}
                </h3>

                {/* 消息 */}
                <p 
                  className="text-gray-600 text-center mb-4"
                  style={{ 
                    fontSize: isElderMode ? '20px' : '16px',
                    lineHeight: '1.6'
                  }}
                >
                  {error.message}
                </p>

                {/* 解决方案 */}
                <motion.div 
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 mb-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-start">
                    <span 
                      className="mr-3 flex-shrink-0"
                      style={{ fontSize: isElderMode ? '32px' : '24px' }}
                    >
                      💡
                    </span>
                    <div className="flex-1">
                      <p 
                        className="font-medium text-blue-900 mb-1"
                        style={{ fontSize: isElderMode ? '18px' : '14px' }}
                      >
                        解决方案
                      </p>
                      <p 
                        className="text-blue-700"
                        style={{ 
                          fontSize: isElderMode ? '18px' : '14px',
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
                      className="px-6 py-3 bg-gradient-to-r from-[#D4302B] to-[#E84A3D] text-white rounded-xl font-bold hover:shadow-xl transition-all active:scale-95"
                      style={{ 
                        fontSize: isElderMode ? '20px' : '16px',
                        minWidth: isElderMode ? '140px' : '120px',
                        minHeight: isElderMode ? '56px' : '48px'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {error.actionText || '重试'}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={onClose}
                    className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border-2 border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
                    style={{ 
                      fontSize: isElderMode ? '20px' : '16px',
                      minWidth: isElderMode ? '140px' : '120px',
                      minHeight: isElderMode ? '56px' : '48px'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    我知道了
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
