import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CornerBackground from '@/components/CornerBackground';
import PaymentModal from '../components/PaymentModal';
import ProductRecommendation from '../components/ProductRecommendation';
import Loading from '@/components/Loading';
import { useUser } from '../contexts/UserContext';
import { useModeConfig } from '@/hooks/useModeConfig';
import ElderModeToggle from '@/components/ElderModeToggle';
import PageTransition from '@/components/PageTransition';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/apiConfig';

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const modeConfig = useModeConfig();
  
  // 从路由状态获取选中的图片和历史记录信息
  const { selectedImage, historyItem, hasLivePhoto, fromHistory } = location.state || {};
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductRecommendation, setShowProductRecommendation] = useState(false);
  const [isPlayingLivePhoto, setIsPlayingLivePhoto] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // 如果没有图片数据，根据来源返回不同页面
  useEffect(() => {
    if (!selectedImage) {
      if (fromHistory) {
        // 从历史记录进入但没有数据，返回模式首页
        const targetPath = modeConfig ? modeConfig.slug : '/';
        navigate(targetPath, { replace: true });
      } else {
        // 否则返回结果选择页
        const targetPath = modeConfig ? `${modeConfig.slug}/result-selector` : '/result-selector';
        navigate(targetPath, { replace: true });
      }
    }
  }, [selectedImage, fromHistory, modeConfig, navigate]);
  
  // 如果没有图片数据，显示加载状态
  if (!selectedImage) {
    return (
      <PageTransition>
        <CornerBackground>
          <div className="min-h-screen w-full flex items-center justify-center">
            <Loading text="正在加载..." size="large" />
          </div>
        </CornerBackground>
      </PageTransition>
    );
  }
  
  // 自动播放5秒微动态（如果有）
  useEffect(() => {
    if (hasLivePhoto && !isPlayingLivePhoto) {
      const timer = setTimeout(() => {
        setIsPlayingLivePhoto(true);
        // 5秒后停止播放
        setTimeout(() => {
          setIsPlayingLivePhoto(false);
        }, 5000);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [hasLivePhoto]);
  
  // 实际执行下载的函数（仅在用户选择免费/付费选项后调用）
  const doDownload = () => {
    // PC端和移动端都直接下载
    const link = document.createElement('a');
    link.href = selectedImage;
    link.download = `团圆照相馆-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('🎉 图片已保存');
  };
  
  // 点击保存按钮 → 先弹出增值服务推荐
  const handleDownload = () => {
    setShowProductRecommendation(true);
  };
  
  const handleGenerateGreetingCard = () => {
    // 跳转到贺卡编辑页
    navigate('/card-editor', { state: { selectedImage } });
  };
  
  const handleOrderProduct = async (
    productType: 'crystal' | 'scroll',
    shippingInfo: { name: string; phone: string; address: string }
  ) => {
    try {
      if (!user?.id || !historyItem) {
        toast.error('订单信息不完整');
        return;
      }
      
      // 调用API创建产品订单
      const response = await fetch(buildApiUrl(API_ENDPOINTS.PRODUCT_ORDER_CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          generationId: historyItem.id,
          productType: productType,
          productPrice: productType === 'crystal' ? 199 : 149,
          shippingName: shippingInfo.name,
          shippingPhone: shippingInfo.phone,
          shippingAddress: shippingInfo.address,
          imageUrl: selectedImage
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '创建订单失败');
      }
      
      toast.success('订单提交成功！我们将在1-2个工作日内与您联系');
      setShowProductRecommendation(false);
    } catch (error) {
      console.error('创建产品订单失败:', error);
      toast.error(error instanceof Error ? error.message : '创建订单失败，请重试');
      throw error;
    }
  };
  
  const handleShare = async () => {
    try {
      // 生成带小程序码的分享图
      // TODO: 实现分享图生成逻辑
      
      if (navigator.share) {
        await navigator.share({
          title: 'AI全家福·团圆照相馆',
          text: '这个春节，让爱没有距离！看看我生成的AI全家福 🎊',
          url: window.location.href
        });
        toast.success('分享成功');
      } else {
        // 复制链接到剪贴板
        await navigator.clipboard.writeText(window.location.href);
        toast.success('链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      if ((error as Error).name !== 'AbortError') {
        toast.error('分享失败，请重试');
      }
    }
  };
  

  
  const handleCompletePayment = () => {
    setShowPaymentModal(false);
    toast.success('🎉 支付成功！');
    
    // 支付成功后显示产品推荐
    setShowProductRecommendation(true);
  };
  
  // 产品推荐关闭时的处理
  const handleProductRecommendationClose = () => {
    setShowProductRecommendation(false);
  };
  
  // 用户选择"暂不购买"，执行下载
  const handleSkipAndDownload = () => {
    setShowProductRecommendation(false);
    // 延迟一点执行下载，让弹窗先关闭
    setTimeout(() => {
      doDownload();
    }, 300);
  };
  
  return (
    <PageTransition>
      <CornerBackground>
        <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
          {/* 装饰背景元素 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-24 left-6 text-2xl opacity-20"
              animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              🏮
            </motion.div>
            <motion.div
              className="absolute bottom-40 right-6 text-2xl opacity-20"
              animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              🏮
            </motion.div>
          </div>
          
          {/* 模式名称副标题栏 */}
          <div className="sticky top-0 z-40 w-full bg-[#6B0000] shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="max-w-md mx-auto px-4 py-1.5 text-center">
              <h2 className="text-sm font-medium text-[#FFD700]/90 flex items-center justify-center">
                <span className="mr-1.5 text-base">{modeConfig?.theme.icon}</span>
                {modeConfig?.name || '生成结果'}
              </h2>
            </div>
          </div>

          {/* 顶部导航栏 */}
          <header className="sticky z-30 w-full backdrop-blur-md bg-[#8B0000]/90 shadow-lg px-4 py-3 border-b border-[#D4AF37]/30" style={{ top: 'calc(env(safe-area-inset-top) + 36px)' }}>
            <div className="flex items-center justify-between max-w-md mx-auto">
              <div className="w-10"></div>
              <h1 className="text-xl font-bold text-[#FFD700] drop-shadow-sm">生成结果</h1>
              <ElderModeToggle />
            </div>
          </header>

          <main className="flex-1 z-10 flex flex-col">
            {/* 高清图展示区 */}
            <div className="relative p-4 select-none touch-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
              {/* 金色外边框 */}
              <div className="relative p-0.5 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] select-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
                <div className="relative bg-gradient-to-br from-[#8B0000]/95 to-[#6B0000]/95 rounded-2xl p-3 select-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
                  {/* Live Photo标识 */}
                  {hasLivePhoto && (
                    <motion.div 
                      className="absolute top-5 left-5 z-30 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center border border-[#FFD700]/30"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="w-2 h-2 bg-[#FFD700] rounded-full mr-2 animate-pulse" />
                      <span className="text-xs font-medium text-[#FFD700]">Live</span>
                    </motion.div>
                  )}
                  
                  {/* 高清图片 */}
                  <motion.div
                    className="relative pointer-events-none select-none touch-none"
                    style={{ 
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      userSelect: 'none'
                    }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* 内层金色边框 */}
                    <div className="relative p-0.5 rounded-xl bg-gradient-to-br from-[#FFD700]/80 to-[#D4AF37]/80">
                      <div className="relative w-full overflow-hidden rounded-xl bg-[#FFF8DC]">
                        {/* Loading 状态 */}
                        <AnimatePresence>
                          {!imageLoaded && (
                            <motion.div
                              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#8B0000] to-[#6B0000] z-10 min-h-[200px]"
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              />
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="text-5xl"
                              >
                                🏮
                              </motion.div>
                              <p className="text-[#FFD700] text-sm font-medium mt-3">图片加载中...</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* 使用隐藏的 img 标签来获取图片尺寸和触发加载 */}
                        <img 
                          ref={imageRef}
                          src={selectedImage} 
                          alt="Generated Art Photo" 
                          className="invisible absolute"
                          onLoad={() => setImageLoaded(true)}
                        />
                        
                        {/* 使用背景图显示，无法被长按保存 */}
                        <div
                          className={`w-full rounded-xl transition-opacity duration-300 ${
                            isPlayingLivePhoto ? 'animate-pulse' : ''
                          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                          style={{
                            backgroundImage: `url(${selectedImage})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            aspectRatio: 'auto',
                            minHeight: '300px',
                            paddingBottom: imageRef.current ? `${(imageRef.current.naturalHeight / imageRef.current.naturalWidth) * 100}%` : '100%',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            userSelect: 'none',
                            touchAction: 'none'
                          }}
                          onContextMenu={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onTouchEnd={(e) => e.preventDefault()}
                          onTouchMove={(e) => e.preventDefault()}
                          onMouseDown={(e) => e.preventDefault()}
                        />
                      </div>
                    </div>
                    
                    {/* AI团圆照相馆制作标识 */}
                    <div className="absolute bottom-3 left-3 z-30 bg-black/60 backdrop-blur-sm text-[#FFD700] px-3 py-1.5 rounded-lg text-xs flex items-center border border-[#FFD700]/20">
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      AI团圆照相馆
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* 功能按钮区 */}
            <div className="flex-1 px-4 py-4">
              <div className="max-w-md mx-auto space-y-3">
                {/* 下载高清图按钮 */}
                <motion.button
                  onClick={handleDownload}
                  className="relative w-full h-12 rounded-full overflow-hidden active:scale-[0.98] transition-transform"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                    <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full flex items-center justify-center">
                      <span className="text-[#8B0000] text-base font-bold flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        保存图片
                      </span>
                    </div>
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </motion.button>

                {/* 生成拜年贺卡按钮 */}
                <motion.button
                  onClick={handleGenerateGreetingCard}
                  className="relative w-full h-12 rounded-full overflow-hidden active:scale-[0.98] transition-transform"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                    <div className="w-full h-full bg-gradient-to-r from-[#D4302B] to-[#8B0000] rounded-full flex items-center justify-center">
                      <span className="text-[#FFD700] text-base font-bold flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        生成拜年贺卡
                      </span>
                    </div>
                  </div>
                </motion.button>

                {/* 定制晶瓷画按钮 */}
                <motion.button
                  onClick={() => setShowProductRecommendation(true)}
                  className="relative w-full h-12 rounded-full overflow-hidden active:scale-[0.98] transition-transform"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                    <div className="w-full h-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full flex items-center justify-center">
                      <span className="text-white text-base font-bold flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        定制晶瓷画
                      </span>
                    </div>
                  </div>
                </motion.button>

                {/* 分享家族群按钮 */}
                <motion.button
                  onClick={handleShare}
                  className="relative w-full h-12 rounded-full overflow-hidden active:scale-[0.98] transition-transform"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="w-full h-full bg-white/10 backdrop-blur-sm border border-[#FFD700]/30 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                    <span className="text-[#FFD700] text-base font-medium flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      分享家族群
                    </span>
                  </div>
                </motion.button>
              </div>
            </div>
          </main>

          {/* 支付弹窗 */}
          {showPaymentModal && (
            <PaymentModal 
              isOpen={showPaymentModal}
              onClose={() => setShowPaymentModal(false)} 
              onComplete={handleCompletePayment}
              generationId={historyItem?.id}
            />
          )}
          
          {/* 产品推荐弹窗 */}
          {showProductRecommendation && (
            <ProductRecommendation
              isOpen={showProductRecommendation}
              selectedImage={selectedImage}
              onClose={handleProductRecommendationClose}
              onSkipAndDownload={handleSkipAndDownload}
              onOrderProduct={handleOrderProduct}
            />
          )}
        </div>
      </CornerBackground>
    </PageTransition>
  );
}
