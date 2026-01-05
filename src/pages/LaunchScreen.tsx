import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import { PUZZLE_MODE, TRANSFORM_MODE } from '@/config/modes';
import titleText from '@/assets/title-text.png';

export default function LaunchScreen() {
  const navigate = useNavigate();
  const [userCount] = useState(15430);

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#FFF8F0] to-[#FFE5E5]">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">🏮</div>
        <div className="absolute top-20 right-20 text-6xl animate-pulse" style={{ animationDelay: '1s' }}>🏮</div>
        <div className="absolute bottom-20 left-20 text-6xl animate-pulse" style={{ animationDelay: '2s' }}>🏮</div>
        <div className="absolute bottom-10 right-10 text-6xl animate-pulse" style={{ animationDelay: '1.5s' }}>🏮</div>
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-md w-full">
        {/* 主标题 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8"
        >
          <img src={titleText} alt="这个春节，让爱没有距离" className="w-full" style={{ maxWidth: '20rem' }} />
        </motion.div>

        {/* 统计信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-8"
        >
          <p className="text-[#D4302B] text-xl font-bold">
            {userCount.toLocaleString()} 个家庭已生成
          </p>
        </motion.div>

        {/* 模式选择卡片 */}
        <div className="w-full space-y-4 mb-6">
          {/* 时空拼图卡片 */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            onClick={() => navigate(PUZZLE_MODE.slug)}
            className="w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-[#FFE5E5] to-[#FFD6D6] p-6 border-2 border-[#D4302B]/30 hover:border-[#D4302B] transition-all">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{PUZZLE_MODE.theme.icon}</div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-bold text-[#D4302B] mb-1">{PUZZLE_MODE.name}</h3>
                  <p className="text-sm text-gray-700">{PUZZLE_MODE.content.slogan}</p>
                  <p className="text-xs text-gray-500 mt-1">{PUZZLE_MODE.content.description}</p>
                </div>
                <i className="fas fa-chevron-right text-[#D4302B] text-xl"></i>
              </div>
            </div>
          </motion.button>

          {/* 富贵变身卡片 */}
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            onClick={() => navigate(TRANSFORM_MODE.slug)}
            className="w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-[#FFF9E5] to-[#FFF0CC] p-6 border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{TRANSFORM_MODE.theme.icon}</div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-bold text-[#D4AF37] mb-1">{TRANSFORM_MODE.name}</h3>
                  <p className="text-sm text-gray-700">{TRANSFORM_MODE.content.slogan}</p>
                  <p className="text-xs text-gray-500 mt-1">{TRANSFORM_MODE.content.description}</p>
                </div>
                <i className="fas fa-chevron-right text-[#D4AF37] text-xl"></i>
              </div>
            </div>
          </motion.button>
        </div>

        {/* 底部提示 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-gray-500 text-sm"
        >
          选择一个模式开始制作
        </motion.p>
      </div>
    </div>
    </PageTransition>
  );
}
