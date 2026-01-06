import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 半透明背景 */}
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* 弹窗内容 - 春节风格 */}
          <motion.div
            className="relative bg-gradient-to-b from-[#FFF8F0] to-white rounded-2xl w-full max-w-md z-10 shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* 顶部装饰条 - 红金渐变 */}
            <div className="h-1.5 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
            
            {/* 顶部装饰元素 */}
            <div className="absolute top-4 left-4 text-2xl opacity-60">🧧</div>
            <div className="absolute top-4 right-4 text-2xl opacity-60">🧧</div>
            
            <div className="p-6 pt-10">
              <h3 className="text-xl font-bold text-[#D4302B] mb-2 text-center">📖 使用帮助</h3>
              <p className="text-gray-500 text-sm text-center mb-6">轻松几步，制作专属全家福</p>
              
              <ul className="space-y-4 mb-6">
                <li className="flex items-start bg-white rounded-xl p-3 border border-[#D4302B]/10 shadow-sm">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4302B] to-[#E84A3D] text-white flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">1</span>
                  <span className="text-gray-700 pt-0.5">上传/拍照后点击生成</span>
                </li>
                <li className="flex items-start bg-white rounded-xl p-3 border border-[#D4302B]/10 shadow-sm">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4302B] to-[#E84A3D] text-white flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">2</span>
                  <span className="text-gray-700 pt-0.5">最多可重生成 3 次，算 1 次收费</span>
                </li>
                <li className="flex items-start bg-white rounded-xl p-3 border border-[#D4302B]/10 shadow-sm">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4302B] to-[#E84A3D] text-white flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">3</span>
                  <span className="text-gray-700 pt-0.5">支付后可保存艺术照</span>
                </li>
              </ul>
              
              {/* 关闭按钮 */}
              <motion.button
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white font-bold text-lg shadow-lg"
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
              >
                我知道了
              </motion.button>
            </div>
            
            {/* 底部装饰 */}
            <div className="h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;