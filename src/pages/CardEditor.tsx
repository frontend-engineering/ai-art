import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Background from '../components/Background';
import ElderModeToggle from '@/components/ElderModeToggle';
import PageTransition from '@/components/PageTransition';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/apiConfig';
import { useUser } from '@/contexts/UserContext';
import html2canvas from 'html2canvas';

// 预设祝福语
const PRESET_GREETINGS = [
  '新春快乐，阖家欢乐！',
  '恭贺新禧，万事如意！',
  '福星高照，好运连连！',
  '龙年大吉，心想事成！',
  '团团圆圆，幸福美满！',
  '岁岁平安，年年有余！',
];

// 中国风装饰SVG组件
const ChineseCornerPattern = ({ className = '', rotate = 0 }: { className?: string; rotate?: number }) => (
  <svg 
    viewBox="0 0 80 80" 
    className={className}
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    {/* 回纹角花 */}
    <path
      d="M0 0 L20 0 L20 5 L5 5 L5 20 L0 20 Z"
      fill="currentColor"
      opacity="0.9"
    />
    <path
      d="M10 10 L30 10 L30 15 L15 15 L15 30 L10 30 Z"
      fill="currentColor"
      opacity="0.7"
    />
    <path
      d="M20 20 L40 20 L40 25 L25 25 L25 40 L20 40 Z"
      fill="currentColor"
      opacity="0.5"
    />
  </svg>
);

// 祥云SVG
const CloudPattern = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 50" className={className}>
    <path
      d="M10 40 Q15 30 25 35 Q30 20 45 25 Q55 15 65 25 Q80 20 85 35 Q95 30 90 40 Z"
      fill="currentColor"
      opacity="0.3"
    />
  </svg>
);

// 福字装饰
const FuCharacter = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <text
      x="50"
      y="65"
      textAnchor="middle"
      fontSize="50"
      fontFamily="KaiTi, STKaiti, serif"
      fill="currentColor"
      opacity="0.15"
    >
      福
    </text>
  </svg>
);

export default function CardEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedImage } = location.state || {};
  const { user } = useUser();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [customGreeting, setCustomGreeting] = useState('新春快乐，阖家欢乐！');
  const [isSaving, setIsSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  if (!selectedImage) {
    navigate('/generator');
    return null;
  }
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSelectPreset = (greeting: string) => {
    setCustomGreeting(greeting);
  };

  // 导出贺卡为图片
  const exportCardAsImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('导出贺卡失败:', error);
      return null;
    }
  };
  
  const handleSave = async () => {
    if (!user?.id) {
      toast.error('请先登录');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.GREETING_CARD_CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          imageUrl: selectedImage,
          greeting: customGreeting,
          templateStyle: 'chinese-traditional'
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '保存贺卡失败');
      }
      
      toast.success('贺卡已保存');
      navigate(-1);
    } catch (error) {
      console.error('保存贺卡失败:', error);
      toast.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleShare = async () => {
    setIsExporting(true);
    try {
      const imageData = await exportCardAsImage();
      
      if (imageData && navigator.share) {
        const blob = await (await fetch(imageData)).blob();
        const file = new File([blob], '新春贺卡.png', { type: 'image/png' });
        
        await navigator.share({
          title: '新春贺卡',
          text: customGreeting,
          files: [file]
        });
        toast.success('分享成功');
      } else {
        await navigator.clipboard.writeText(customGreeting);
        toast.success('祝福语已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      if ((error as Error).name !== 'AbortError') {
        toast.error('分享失败，请重试');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // 下载贺卡
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const imageData = await exportCardAsImage();
      if (imageData) {
        const link = document.createElement('a');
        link.download = '新春贺卡.png';
        link.href = imageData;
        link.click();
        toast.success('贺卡已下载');
      }
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-[#FFF8F0]">
        <Background />
        
        {/* 模式名称副标题栏 */}
        <div className="sticky top-0 z-40 w-full bg-[#6B0000] shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="max-w-md mx-auto px-4 py-1.5 text-center">
            <h2 className="text-sm font-medium text-[#FFD700]/90 flex items-center justify-center">
              <span className="mr-1.5 text-base">🎊</span>
              拜年贺卡
            </h2>
          </div>
        </div>
        
        {/* 顶部导航栏 */}
        <header className="sticky z-30 w-full backdrop-blur-sm bg-white/70 shadow-sm px-4 py-3" style={{ top: 'calc(env(safe-area-inset-top) + 36px)' }}>
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBack} 
              className="flex items-center text-[#D4302B] font-medium cursor-pointer"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回</span>
            </button>
            <h1 className="text-xl font-bold text-[#D4302B]">生成拜年贺卡</h1>
            <ElderModeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 z-10 overflow-y-auto">
          <div className="max-w-md mx-auto space-y-6">
            {/* 贺卡预览区 */}
            <motion.div 
              className="bg-white rounded-xl p-4 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">贺卡预览</h2>
              
              {/* 中国风传统请柬贺卡 */}
              <div 
                ref={cardRef}
                className="relative w-full aspect-[3/4] overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 50%, #7F1D1D 100%)',
                  borderRadius: '8px',
                }}
              >
                {/* 外层金色边框 */}
                <div className="absolute inset-2 border-2 border-[#D4AF37] rounded-sm" />
                <div className="absolute inset-3 border border-[#D4AF37]/50 rounded-sm" />
                
                {/* 四角回纹装饰 */}
                <ChineseCornerPattern className="absolute top-4 left-4 w-12 h-12 text-[#D4AF37]" rotate={0} />
                <ChineseCornerPattern className="absolute top-4 right-4 w-12 h-12 text-[#D4AF37]" rotate={90} />
                <ChineseCornerPattern className="absolute bottom-4 left-4 w-12 h-12 text-[#D4AF37]" rotate={270} />
                <ChineseCornerPattern className="absolute bottom-4 right-4 w-12 h-12 text-[#D4AF37]" rotate={180} />
                
                {/* 顶部祥云装饰 */}
                <CloudPattern className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-16 text-[#D4AF37]" />
                
                {/* 背景福字水印 */}
                <FuCharacter className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-[#D4AF37]" />
                
                {/* 顶部标题 */}
                <div className="absolute top-8 left-0 right-0 text-center">
                  <div className="inline-block px-6 py-1 relative">
                    <span 
                      className="text-[#D4AF37] text-lg tracking-[0.3em]"
                      style={{ fontFamily: 'KaiTi, STKaiti, serif' }}
                    >
                      恭贺新禧
                    </span>
                    {/* 标题下装饰线 */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
                  </div>
                </div>
                
                {/* 照片区域 - 带金色相框 */}
                <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[65%] aspect-square">
                  {/* 相框外层装饰 */}
                  <div className="absolute -inset-3 border border-[#D4AF37]/30 rounded-sm" />
                  {/* 相框主体 */}
                  <div className="absolute inset-0 border-4 border-[#D4AF37] rounded-sm shadow-lg overflow-hidden bg-[#FFF8DC]">
                    {/* 相框内角装饰 */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/50" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/50" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/50" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/50" />
                    
                    {/* Loading 状态 */}
                    <AnimatePresence>
                      {!imageLoaded && (
                        <motion.div
                          className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFF8DC] z-10"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <img 
                      src={selectedImage} 
                      alt="全家福" 
                      className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImageLoaded(true)}
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
                
                {/* 祝福语区域 */}
                <div className="absolute bottom-[18%] left-0 right-0 px-8">
                  {/* 祝福语上方装饰 */}
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#D4AF37]" />
                    <div className="mx-2 w-2 h-2 rotate-45 border border-[#D4AF37]" />
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#D4AF37]" />
                  </div>
                  
                  {/* 祝福语文字 */}
                  <p 
                    className="text-center text-[#D4AF37] text-xl leading-relaxed tracking-wider"
                    style={{ 
                      fontFamily: 'KaiTi, STKaiti, serif',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
                    {customGreeting}
                  </p>
                  
                  {/* 祝福语下方装饰 */}
                  <div className="flex items-center justify-center mt-3">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#D4AF37]" />
                    <div className="mx-2 w-2 h-2 rotate-45 border border-[#D4AF37]" />
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#D4AF37]" />
                  </div>
                </div>
                
                {/* 底部署名 */}
                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <p 
                    className="text-[#D4AF37]/70 text-xs tracking-widest"
                    style={{ fontFamily: 'KaiTi, STKaiti, serif' }}
                  >
                    AI全家福·团圆照相馆
                  </p>
                </div>
                
                {/* 底部祥云装饰 */}
                <CloudPattern className="absolute bottom-4 left-8 w-16 h-8 text-[#D4AF37] rotate-180" />
                <CloudPattern className="absolute bottom-4 right-8 w-16 h-8 text-[#D4AF37] rotate-180" />
              </div>
            </motion.div>

            {/* 祝福语编辑 */}
            <motion.div 
              className="bg-white rounded-xl p-4 shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-base font-semibold text-gray-800 mb-3">选择祝福语</h3>
              
              {/* 预设祝福语 */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {PRESET_GREETINGS.map((greeting, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectPreset(greeting)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                        customGreeting === greeting
                          ? 'bg-gradient-to-r from-[#D4302B] to-[#B91C1C] text-white shadow-md'
                          : 'bg-[#FFF8F0] text-[#8B4513] hover:bg-[#FFE4C4] border border-[#D4AF37]/30'
                      }`}
                    >
                      {greeting}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 自定义输入 */}
              <div>
                <p className="text-sm text-gray-600 mb-2">或输入自定义祝福语：</p>
                <textarea
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  placeholder="输入您的祝福语..."
                  maxLength={30}
                  rows={2}
                  className="w-full px-4 py-3 border border-[#D4AF37]/30 rounded-lg focus:outline-none focus:border-[#D4302B] focus:ring-1 focus:ring-[#D4302B]/30 resize-none bg-[#FFFAF5]"
                  style={{ fontFamily: 'KaiTi, STKaiti, serif' }}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {customGreeting.length}/30
                </p>
              </div>
            </motion.div>

            {/* 操作按钮 */}
            <motion.div 
              className="space-y-3 pb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* 下载按钮 */}
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className={`w-full h-12 rounded-xl font-medium flex items-center justify-center shadow-lg cursor-pointer transition-all ${
                  isExporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#D4302B] to-[#B91C1C] text-white hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {isExporting ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    处理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    下载贺卡
                  </>
                )}
              </button>
              
              {/* 分享按钮 */}
              <button
                onClick={handleShare}
                disabled={isExporting}
                className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white rounded-xl font-medium flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                分享贺卡
              </button>
              
              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full h-12 rounded-xl font-medium flex items-center justify-center border-2 transition-all cursor-pointer ${
                  isSaving
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-[#D4302B] border-[#D4302B] hover:bg-[#FFF5F5]'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    保存中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    保存到相册
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
