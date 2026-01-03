import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Background from '../components/Background';
import PaymentModal from '../components/PaymentModal';
import ProductRecommendation from '../components/ProductRecommendation';
import FestivalGreeting from '../components/FestivalGreeting';
import { useUser } from '../contexts/UserContext';
import PageTransition from '@/components/PageTransition';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/apiConfig';

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  
  // 从路由状态获取选中的图片和历史记录信息
  const { selectedImage, historyItem, hasLivePhoto } = location.state || {};
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductRecommendation, setShowProductRecommendation] = useState(false);
  const [isPaid, setIsPaid] = useState(historyItem?.isPaid || false);
  const [isPlayingLivePhoto, setIsPlayingLivePhoto] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // 如果没有图片数据，返回生成页
  if (!selectedImage) {
    navigate('/generator');
    return null;
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
    navigate('/generator');
  };
  
  const handleDownload = () => {
    if (!isPaid) {
      setShowPaymentModal(true);
      return;
    }
    
    // 下载图片
    const link = document.createElement('a');
    link.href = selectedImage;
    link.download = `ai-family-photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('高清图已保存到相册');
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
    // 长按保存带水印预览图
    if (!isPaid) {
      const link = document.createElement('a');
      link.href = selectedImage;
      link.download = `ai-family-photo-preview-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    }
  };
  
  const handleCompletePayment = () => {
    setShowPaymentModal(false);
    setIsPaid(true);
    toast.success('支付成功！您可以下载高清无水印照片了');
    
    // 支付成功后显示产品推荐
    setShowProductRecommendation(true);
  };
  
  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-[#FFF8F0]">
      <Background />
      
      {/* 节气文案 */}
      <FestivalGreeting />
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-sm bg-white/70 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="flex items-center text-[#D4302B] font-medium"
          >
            <i className="fas fa-arrow-left mr-1"></i>
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-[#D4302B]">生成成果</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="flex-1 z-10 flex flex-col">
        {/* 高清图展示区 - 占据60%屏幕高度 */}
        <div className="relative h-[60vh] bg-gradient-to-b from-gray-900 to-gray-800">
          {/* Live Photo标识 */}
          {hasLivePhoto && (
            <motion.div 
              className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-xs font-semibold text-gray-800">Live</span>
            </motion.div>
          )}
          
          {/* 高清图片 */}
          <motion.div
            className="relative w-full h-full flex items-center justify-center p-4"
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
            <img 
              ref={imageRef}
              src={selectedImage} 
              alt="Generated Art Photo" 
              className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${
                isPlayingLivePhoto ? 'animate-pulse' : ''
              }`}
            />
            
            {/* 红色印章水印 - AI团圆照相馆 */}
            {!isPaid && (
              <motion.div 
                className="absolute bottom-8 right-8 w-24 h-24 opacity-80"
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 0.8, rotate: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="relative w-full h-full">
                  {/* 印章背景 */}
                  <div className="absolute inset-0 bg-[#D4302B] rounded-full border-4 border-[#D4302B] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-xs font-bold leading-tight">
                        AI团圆<br/>照相馆
                      </div>
                    </div>
                  </div>
                  {/* 小程序码占位 */}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded border-2 border-[#D4302B] flex items-center justify-center">
                    <i className="fas fa-qrcode text-[#D4302B] text-xs"></i>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
          
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

        {/* 功能按钮区 - 占据40%屏幕高度 */}
        <div className="flex-1 bg-[#FFF8F0] px-6 py-6">
          <div className="max-w-md mx-auto space-y-4">
            {/* 下载高清图按钮 - 金色 */}
            <motion.button
              onClick={handleDownload}
              className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#F4CF47] text-white rounded-xl font-medium flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <i className={`fas fa-${isPaid ? 'download' : 'lock'} mr-2 text-lg`}></i>
              <span className="text-base">{isPaid ? '下载高清图' : '下载高清图'}</span>
            </motion.button>

            {/* 生成拜年贺卡按钮 - 红色 */}
            <motion.button
              onClick={handleGenerateGreetingCard}
              className="w-full h-12 bg-gradient-to-r from-[#D4302B] to-[#E74C3C] text-white rounded-xl font-medium flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <i className="fas fa-envelope mr-2 text-lg"></i>
              <span className="text-base">生成拜年贺卡</span>
            </motion.button>

            {/* 定制晶瓷画按钮 - 紫色 */}
            <motion.button
              onClick={() => setShowProductRecommendation(true)}
              className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] text-white rounded-xl font-medium flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <i className="fas fa-image mr-2 text-lg"></i>
              <span className="text-base">定制晶瓷画</span>
            </motion.button>

            {/* 分享家族群按钮 - 灰色 */}
            <motion.button
              onClick={handleShare}
              className="w-full h-12 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <i className="fas fa-share-alt mr-2 text-lg"></i>
              <span className="text-base">分享家族群</span>
            </motion.button>

            {/* 温馨提示 */}
            <motion.div 
              className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-start">
                <i className="fas fa-info-circle text-[#D4302B] mt-1 mr-3"></i>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    {!isPaid 
                      ? '长按图片可保存带水印预览图。付费后可下载无水印高清原图。' 
                      : '您的高清无水印照片已准备好，可以下载保存了！'}
                  </p>
                </div>
              </div>
            </motion.div>
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
          onClose={() => setShowProductRecommendation(false)}
          onOrderProduct={handleOrderProduct}
        />
      )}
    </div>
    </PageTransition>
  );
}
