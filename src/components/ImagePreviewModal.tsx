import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  isOpen, 
  imageUrl, 
  onClose 
}) => {
  const handleSaveImage = () => {
    if (!imageUrl) return;
    
    // 创建一个临时链接用于下载
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `art-photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!imageUrl) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90">
          {/* 顶部装饰 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
          
          {/* 关闭按钮 - 春节风格 */}
          <button
            className="absolute top-6 right-4 text-white p-3 rounded-full bg-gradient-to-br from-[#D4302B] to-[#B82820] shadow-lg hover:shadow-xl transition-all"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* 顶部装饰元素 */}
          <div className="absolute top-6 left-4 text-3xl opacity-60">🏮</div>
          
          {/* 图片预览 */}
          <motion.div
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="relative">
              {/* 图片边框装饰 */}
              <div className="absolute -inset-2 bg-gradient-to-br from-[#D4302B] via-[#FFD700] to-[#D4302B] rounded-xl opacity-60" />
              <img 
                src={imageUrl} 
                alt="预览大图" 
                className="relative max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </motion.div>
          
          {/* 底部操作栏 - 春节风格 */}
          <motion.div
            className="w-full mt-4 flex justify-center"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.button
              onClick={handleSaveImage}
              className="py-4 px-10 bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white rounded-xl font-bold text-lg flex items-center shadow-lg"
              whileTap={{ scale: 0.98 }}
            >
              <span className="mr-2">💾</span>
              <span>保存图片</span>
            </motion.button>
          </motion.div>
          
          {/* 底部装饰 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreviewModal;