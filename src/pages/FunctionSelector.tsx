import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useElderMode } from '@/contexts/ElderModeContext';
import ElderModeToggle from '@/components/ElderModeToggle';
import PageTransition from '@/components/PageTransition';

export default function FunctionSelector() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const { isElderMode } = useElderMode();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleSelectFunction = (functionType: 'puzzle' | 'transform') => {
    if (!user) {
      console.error('用户未初始化');
      return;
    }
    navigate('/upload', { state: { mode: functionType } });
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleShowTutorial = () => {
    setShowTutorial(true);
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
  };

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FFF8F0]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🏮</div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FFF8F0] p-6">
      {/* 返回按钮 - 左上角 */}
      <button 
        onClick={handleBack} 
        className="absolute top-4 left-4 z-20 flex items-center text-[#D4302B] font-medium hover:text-[#B8251F] transition-colors"
      >
        <i className="fas fa-arrow-left mr-1"></i>
        <span>返回</span>
      </button>
      
      {/* 老年模式切换按钮 - 右上角 */}
      <div className="absolute top-4 right-4 z-20">
        <ElderModeToggle />
      </div>
      
      {/* 功能卡片容器 - 上下两个大卡片各占50%屏幕高度 */}
      <div className="w-full max-w-md flex flex-col gap-4 h-[calc(100vh-200px)]">
        {/* 卡片A - 时空拼图 */}
        <motion.div
          onClick={() => handleSelectFunction('puzzle')}
          onMouseEnter={() => setHoveredCard('puzzle')}
          onMouseLeave={() => setHoveredCard(null)}
          whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
          className={`relative flex-1 rounded-lg overflow-hidden cursor-pointer transition-all duration-100 ${
            hoveredCard === 'puzzle' ? 'ring-4 ring-[#D4302B]' : 'shadow-md'
          }`}
          style={{
            background: 'linear-gradient(135deg, #FFE5E5 0%, #FFD6D6 100%)'
          }}
        >
          {/* 背景装饰 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 text-6xl">🧩</div>
            <div className="absolute bottom-4 left-4 text-4xl">🏮</div>
          </div>

          {/* 内容 */}
          <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl mb-4">🧩</div>
            <h2 className="text-2xl font-bold text-[#D4302B] mb-2">
              时空拼图
            </h2>
            <p className="text-xl text-gray-800 mb-3 font-medium">
              家人天各一方？拼出大团圆
            </p>
            <div className="bg-white/60 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-sm text-gray-700">
                3张单人照 → 合成故宫全家福
              </p>
            </div>
          </div>

          {/* Hover时的阴影效果已通过whileHover实现 */}
        </motion.div>

        {/* 卡片B - 富贵变身 */}
        <motion.div
          onClick={() => handleSelectFunction('transform')}
          onMouseEnter={() => setHoveredCard('transform')}
          onMouseLeave={() => setHoveredCard(null)}
          whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
          className={`relative flex-1 rounded-lg overflow-hidden cursor-pointer transition-all duration-100 ${
            hoveredCard === 'transform' ? 'ring-4 ring-[#D4AF37]' : 'shadow-md'
          }`}
          style={{
            background: 'linear-gradient(135deg, #FFF9E5 0%, #FFF0CC 100%)'
          }}
        >
          {/* 背景装饰 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 text-6xl">👑</div>
            <div className="absolute bottom-4 left-4 text-4xl">✨</div>
          </div>

          {/* 内容 */}
          <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-2xl font-bold text-[#D4AF37] mb-2">
              富贵变身
            </h2>
            <p className="text-xl text-gray-800 mb-3 font-medium">
              背景太土？一秒变豪门
            </p>
            <div className="bg-white/60 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-sm text-gray-700">
                杂乱餐桌 → 欧式豪宅背景
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 教程链接 - 底部灰色文字链 - 老年模式下隐藏 */}
      <motion.button
        onClick={handleShowTutorial}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`mt-6 text-gray-500 hover:text-gray-700 transition-colors text-base ${
          isElderMode ? 'elder-mode-hide' : ''
        }`}
      >
        有疑问？查看30秒教程
      </motion.button>

      {/* 教程视频弹窗 */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={handleCloseTutorial}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl overflow-hidden max-w-2xl w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 红色边框顶部装饰 */}
              <div className="h-2 bg-gradient-to-r from-[#D4302B] to-[#D4AF37]" />
              
              {/* 关闭按钮 */}
              <button
                onClick={handleCloseTutorial}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors shadow-lg"
              >
                ✕
              </button>

              {/* 视频内容区域 */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#D4302B] mb-4 text-center">
                  30秒快速教程
                </h3>
                
                {/* 视频播放器占位 */}
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎬</div>
                    <p className="text-gray-600 mb-2">教程视频播放器</p>
                    <p className="text-sm text-gray-500">
                      实际应用中这里会嵌入视频播放器
                    </p>
                  </div>
                </div>

                {/* 教程步骤说明 */}
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#D4302B] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <p>选择功能：时空拼图（多人合成）或富贵变身（背景替换）</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#D4302B] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <p>上传照片：选择清晰的正面照，确保人脸清晰可见</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#D4302B] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <p>选择模板：挑选喜欢的背景风格</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#D4302B] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <p>等待生成：AI智能合成，约15秒完成</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#D4302B] text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                    <p>选择保存：从4张结果中选择最满意的一张</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 装饰元素 - 老年模式下隐藏 */}
      <div className={`fixed top-6 left-6 text-4xl opacity-60 animate-pulse ${isElderMode ? 'elder-mode-hide' : ''}`}>🏮</div>
      <div className={`fixed top-6 right-6 text-4xl opacity-60 animate-pulse ${isElderMode ? 'elder-mode-hide' : ''}`} style={{ animationDelay: '0.5s' }}>🏮</div>
    </div>
    </PageTransition>
  );
}
