import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import { TRANSFORM_MODE } from '@/config/modes';
import launchBg2 from '@/assets/launch-bg2.png';
import titleText from '@/assets/title-text.png';
import videoFrame from '@/assets/video-frame.png';
import buttonFrame from '@/assets/button-frame.png';

export default function TransformLaunchScreen() {
  const navigate = useNavigate();
  const config = TRANSFORM_MODE;

  const handleStart = () => {
    navigate(`${config.slug}/upload`);
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* 背景图片 - 使用金色主题 */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${launchBg2})`,
            backgroundColor: '#FFF8DC',
          }}
        />

        {/* 金色渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8DC]/50 via-transparent to-[#D4AF37]/30" />

        {/* 内容区域 */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-md">
          {/* 主标题 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-4"
          >
            <img src={titleText} alt="这个春节，让爱没有距离" className="w-full" style={{ maxWidth: '20rem' }} />
          </motion.div>

          {/* 模式图标和名称 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-6"
          >
            <div className="text-6xl mb-2">{config.theme.icon}</div>
            <h2 className="text-3xl font-bold text-[#D4AF37] mb-2">{config.name}</h2>
            <p className="text-xl text-[#8B4513] font-medium">{config.content.slogan}</p>
          </motion.div>

          {/* 视频预览框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="relative w-full max-w-sm mb-8"
          >
            <img src={videoFrame} alt="视频预览" className="w-full" />
          </motion.div>

          {/* 功能说明 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mb-6 bg-white/80 backdrop-blur-sm rounded-lg px-6 py-3"
          >
            <p className="text-[#8B4513] text-base">{config.content.description}</p>
          </motion.div>

          {/* 立即制作按钮 */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            onClick={handleStart}
            className="relative w-64 h-auto group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* 金色按钮背景 */}
            <div className="relative">
              <img src={buttonFrame} alt="" className="w-full" />
              
              {/* 按钮文字 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#8B0000]">{config.content.buttonText}</span>
              </div>
              
              {/* 光效动画 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
