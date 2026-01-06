import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import CornerBackground from '@/components/CornerBackground';
import PaymentModal from '../components/PaymentModal';
import ProductRecommendation from '../components/ProductRecommendation';
import { useUser } from '../contexts/UserContext';
import { useModeConfig } from '@/hooks/useModeConfig';
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
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
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
            <div className="text-white text-center">
              <div className="text-4xl mb-4">🏮</div>
              <p>正在加载...</p>
            </div>
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
  
  const handleBack = () => {
    // 如果是从历史记录进入的，返回到模式首页
    if (fromHistory) {
      const targetPath = modeConfig ? modeConfig.slug : '/';
      navigate(targetPath);
      return;
    }
    
    // 返回到结果选择页
    const targetPath = modeConfig ? `${modeConfig.slug}/result-selector` : '/result-selector';
    navigate(targetPath, {
      state: location.state // 保持原有状态
    });
  };
  
  // 检测是否为移动端
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // 实际执行下载的函数
  const doDownload = () => {
    if (isMobile) {
      // 移动端：提示用户长按图片保存
      toast.success('💡 请长按上方图片，选择"保存图片"到相册', {
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #D4302B 0%, #B82820 100%)',
          color: 'white',
          border: '2px solid #FFD700',
        }
      });
    } else {
      // PC端：直接下载
      const link = document.createElement('a');
      link.href = selectedImage;
      link.download = `团圆照相馆-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('🎉 图片已保存');
    }
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
  
  const handleLongPress = () => {
    // 长按保存图片
    if (isMobile) {
      toast.success('💡 请长按图片，选择"保存图片"', {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #D4302B 0%, #B82820 100%)',
          color: 'white',
          border: '2px solid #FFD700',
        }
      });
    } else {
      doDownload();
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
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
        {/* 祥云装饰 */}
        <motion.div
          className="absolute top-20 left-10 text-4xl opacity-10"
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute bottom-40 right-10 text-4xl opacity-10"
          animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          ☁️
        </motion.div>
        
        {/* 金币装饰 */}
        <motion.div
          className="absolute top-32 right-16 text-2xl opacity-30"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          🪙
        </motion.div>
      </div>
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-sm bg-[#8B0000]/80 shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="flex items-center text-[#FFD700] font-medium hover:text-[#FFC700] transition-colors"
          >
            <i className="fas fa-arrow-left mr-1"></i>
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-[#FFD700]">生成结果</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="flex-1 z-10 flex flex-col">
        {/* 高清图展示区 - 金色相框 */}
        <div className="relative p-4">
          <div className="relative p-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
            <div className="relative bg-gradient-to-br from-[#8B0000] to-[#B8001F] rounded-xl p-4">
              {/* Live Photo标识 */}
              {hasLivePhoto && (
                <motion.div 
                  className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs font-semibold text-gray-800">Live</span>
                </motion.div>
              )}
              
              {/* 高清图片 - 金色内边框 */}
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                onContextMenu={(e) => e.preventDefault()}
                onTouchStart={() => {
                  const longPressTimer = setTimeout(() => {
                    handleLongPress();
                  }, 800);
                  
                  const handleTouchEnd = () => {
                    clearTimeout(longPressTimer);
                    document.removeEventListener('touchend', handleTouchEnd);
                  };
                  
                  document.addEventListener('touchend', handleTouchEnd);
                }}
              >
                <div className="relative p-0.5 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#D4AF37]">
                  <img 
                    ref={imageRef}
                    src={selectedImage} 
                    alt="Generated Art Photo" 
                    className={`w-full h-auto object-contain rounded-lg ${
                      isPlayingLivePhoto ? 'animate-pulse' : ''
                    }`}
                  />
                </div>
                
                {/* AI团圆照相馆制作标识 */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs flex items-center">
                  <i className="fas fa-robot mr-1"></i>
                  AI团圆照相馆制作
                </div>
                
                {/* 小程序码水印 - 免费版也不显示水印 */}
              </motion.div>
            </div>
          </div>
          
          {/* 保存成功提示 */}
          {showSaveSuccess && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <i className="fas fa-check-circle mr-2"></i>
              保存成功
            </motion.div>
          )}
        </div>

        {/* 功能按钮区 */}
        <div className="flex-1 px-6 py-6">
          <div className="max-w-md mx-auto space-y-3">
            {/* 下载高清图按钮 - 金色渐变 */}
            <motion.button
              onClick={handleDownload}
              className="relative w-full h-12 rounded-full overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full flex items-center justify-center hover:from-[#F4C430] hover:to-[#D4AF37] transition-all duration-300">
                  <span className="text-[#8B0000] text-base font-bold flex items-center">
                    <i className="fas fa-download mr-2"></i>
                    保存图片
                  </span>
                </div>
              </div>
              {/* 光效动画 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.button>

            {/* 生成拜年贺卡按钮 - 红色渐变 */}
            <motion.button
              onClick={handleGenerateGreetingCard}
              className="relative w-full h-12 rounded-full overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                <div className="w-full h-full bg-gradient-to-r from-[#D4302B] to-[#E84A3D] rounded-full flex items-center justify-center hover:from-[#C02820] hover:to-[#D74D3A] transition-all duration-300">
                  <span className="text-white text-base font-bold flex items-center">
                    <i className="fas fa-envelope mr-2"></i>
                    生成拜年贺卡
                  </span>
                </div>
              </div>
            </motion.button>

            {/* 定制晶瓷画按钮 - 紫色渐变 */}
            <motion.button
              onClick={() => setShowProductRecommendation(true)}
              className="relative w-full h-12 rounded-full overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                <div className="w-full h-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] rounded-full flex items-center justify-center hover:from-[#7C3AED] hover:to-[#8B5CF6] transition-all duration-300">
                  <span className="text-white text-base font-bold flex items-center">
                    <i className="fas fa-image mr-2"></i>
                    定制晶瓷画
                  </span>
                </div>
              </div>
            </motion.button>

            {/* 分享家族群按钮 - 灰色渐变 */}
            <motion.button
              onClick={handleShare}
              className="relative w-full h-12 rounded-full overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                <div className="w-full h-full bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center hover:from-gray-600 hover:to-gray-700 transition-all duration-300">
                  <span className="text-white text-base font-bold flex items-center">
                    <i className="fas fa-users mr-2"></i>
                    分享家族群
                  </span>
                </div>
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
