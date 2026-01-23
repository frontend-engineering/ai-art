import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useElderMode } from '@/contexts/ElderModeContext';
import ElderModeToggle from '@/components/ElderModeToggle';
import PageTransition from '@/components/PageTransition';
import CornerBackground from '@/components/CornerBackground';
import Loading from '@/components/Loading';

// 中国风图标组件
const PuzzleIcon = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <defs>
      <linearGradient id="puzzleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#D4AF37" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="24" height="24" rx="4" fill="url(#puzzleGrad)" opacity="0.9"/>
    <rect x="36" y="4" width="24" height="24" rx="4" fill="url(#puzzleGrad)" opacity="0.7"/>
    <rect x="4" y="36" width="24" height="24" rx="4" fill="url(#puzzleGrad)" opacity="0.7"/>
    <rect x="36" y="36" width="24" height="24" rx="4" fill="url(#puzzleGrad)" opacity="0.9"/>
    <circle cx="32" cy="32" r="8" fill="#D4302B"/>
    <text x="32" y="36" textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="bold">合</text>
  </svg>
);

const TransformIcon = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <defs>
      <linearGradient id="transformGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D4302B" />
        <stop offset="100%" stopColor="#8B0000" />
      </linearGradient>
    </defs>
    <rect x="8" y="12" width="48" height="40" rx="4" fill="url(#transformGrad)" opacity="0.2"/>
    <rect x="12" y="16" width="40" height="32" rx="2" fill="none" stroke="#FFD700" strokeWidth="2"/>
    <path d="M32 24 L40 32 L32 40 L24 32 Z" fill="#FFD700"/>
    <circle cx="32" cy="32" r="4" fill="#D4302B"/>
    <path d="M16 48 Q32 56 48 48" stroke="#FFD700" strokeWidth="2" fill="none"/>
  </svg>
);

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
      <CornerBackground>
        <div className="min-h-screen w-full flex items-center justify-center">
          <Loading text="正在初始化..." size="large" />
        </div>
      </CornerBackground>
    );
  }

  return (
    <PageTransition>
      <CornerBackground>
        <div className="min-h-screen w-full flex flex-col relative">
          {/* 顶部导航栏 */}
          <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-[#8B0000]/90 shadow-lg px-4 py-3 border-b border-[#D4AF37]/30">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <button 
                onClick={handleBack} 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 text-[#FFD700] hover:bg-black/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-[#FFD700] drop-shadow-sm">选择功能</h1>
              <ElderModeToggle />
            </div>
          </header>

          {/* 主内容区 */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            {/* 功能卡片容器 */}
            <div className="w-full max-w-md flex flex-col gap-5">
              {/* 卡片A - 时空拼图 */}
              <motion.div
                onClick={() => handleSelectFunction('puzzle')}
                onMouseEnter={() => setHoveredCard('puzzle')}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative cursor-pointer group"
              >
                {/* 金色外边框 */}
                <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] opacity-75 group-hover:opacity-100 transition-opacity ${hoveredCard === 'puzzle' ? 'opacity-100' : ''}`} />
                
                {/* 卡片主体 */}
                <div className="relative bg-gradient-to-br from-[#8B0000] to-[#6B0000] rounded-2xl overflow-hidden">
                  {/* 装饰纹理 */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 right-2 text-4xl">🏮</div>
                    <div className="absolute bottom-2 left-2 text-3xl">🎋</div>
                    <div className="absolute top-1/2 left-1/4 text-2xl opacity-50">✨</div>
                  </div>
                  
                  {/* 内容 */}
                  <div className="relative p-6 flex items-center gap-5">
                    {/* 图标区 */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#D4AF37]/10 border border-[#FFD700]/30 flex items-center justify-center">
                        <PuzzleIcon />
                      </div>
                    </div>
                    
                    {/* 文字区 */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-[#FFD700] mb-1">时空拼图</h2>
                      <p className="text-white/90 text-base mb-2">家人天各一方？拼出大团圆</p>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30">
                        <span className="text-[#FFD700] text-xs">多张单人照 → 合成全家福</span>
                      </div>
                    </div>
                    
                    {/* 箭头 */}
                    <div className="flex-shrink-0 text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 卡片B - 富贵变身 */}
              <motion.div
                onClick={() => handleSelectFunction('transform')}
                onMouseEnter={() => setHoveredCard('transform')}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="relative cursor-pointer group"
              >
                {/* 金色外边框 */}
                <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] opacity-75 group-hover:opacity-100 transition-opacity ${hoveredCard === 'transform' ? 'opacity-100' : ''}`} />
                
                {/* 卡片主体 */}
                <div className="relative bg-gradient-to-br from-[#8B0000] to-[#6B0000] rounded-2xl overflow-hidden">
                  {/* 装饰纹理 */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 right-2 text-4xl">🧧</div>
                    <div className="absolute bottom-2 left-2 text-3xl">🪙</div>
                    <div className="absolute top-1/2 right-1/4 text-2xl opacity-50">✨</div>
                  </div>
                  
                  {/* 内容 */}
                  <div className="relative p-6 flex items-center gap-5">
                    {/* 图标区 */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#D4AF37]/10 border border-[#FFD700]/30 flex items-center justify-center">
                        <TransformIcon />
                      </div>
                    </div>
                    
                    {/* 文字区 */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-[#FFD700] mb-1">富贵变身</h2>
                      <p className="text-white/90 text-base mb-2">背景太土？一秒变豪门</p>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30">
                        <span className="text-[#FFD700] text-xs">杂乱背景 → 豪华场景</span>
                      </div>
                    </div>
                    
                    {/* 箭头 */}
                    <div className="flex-shrink-0 text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 教程链接 */}
            <motion.button
              onClick={handleShowTutorial}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`mt-8 text-[#FFD700]/70 hover:text-[#FFD700] transition-colors text-sm flex items-center gap-2 ${
                isElderMode ? 'hidden' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              有疑问？查看30秒教程
            </motion.button>
          </main>

          {/* 教程视频弹窗 */}
          <AnimatePresence>
            {showTutorial && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={handleCloseTutorial}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="relative w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 金色外边框 */}
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]" />
                  
                  {/* 弹窗主体 */}
                  <div className="relative bg-gradient-to-b from-[#FFF8F0] to-white rounded-2xl overflow-hidden">
                    {/* 顶部装饰条 */}
                    <div className="h-1.5 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
                    
                    {/* 装饰元素 */}
                    <div className="absolute top-4 left-4 text-2xl opacity-60">🏮</div>
                    <div className="absolute top-4 right-12 text-2xl opacity-60">🏮</div>
                    
                    {/* 关闭按钮 */}
                    <button
                      onClick={handleCloseTutorial}
                      className="absolute top-3 right-3 z-10 w-8 h-8 bg-[#8B0000] hover:bg-[#6B0000] rounded-full flex items-center justify-center text-[#FFD700] transition-colors shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* 内容区域 */}
                    <div className="p-6 pt-10">
                      <h3 className="text-xl font-bold text-[#D4302B] mb-4 text-center">
                        🎬 30秒快速教程
                      </h3>
                      
                      {/* 视频播放器占位 */}
                      <div className="aspect-video bg-gradient-to-br from-[#8B0000] to-[#6B0000] rounded-xl flex items-center justify-center mb-5 border-2 border-[#D4AF37]/30">
                        <div className="text-center">
                          <motion.div 
                            className="text-5xl mb-3"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            🎬
                          </motion.div>
                          <p className="text-[#FFD700] text-sm">教程视频播放器</p>
                        </div>
                      </div>

                      {/* 教程步骤说明 */}
                      <div className="space-y-3">
                        {[
                          { step: 1, text: '选择功能：时空拼图或富贵变身' },
                          { step: 2, text: '上传照片：选择清晰的正面照' },
                          { step: 3, text: '选择模板：挑选喜欢的背景风格' },
                          { step: 4, text: '等待生成：AI智能合成约15秒' },
                          { step: 5, text: '选择保存：从结果中选择最满意的' },
                        ].map((item) => (
                          <div key={item.step} className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-[#D4302B] to-[#8B0000] text-[#FFD700] rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                              {item.step}
                            </span>
                            <p className="text-sm text-gray-700">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 底部装饰条 */}
                    <div className="h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CornerBackground>
    </PageTransition>
  );
}
