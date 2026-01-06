import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPaymentOrder, initiateWeChatPayment, getPaymentOrderStatus } from '../lib/api';
import { useUser } from '../contexts/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  generationId?: string;
}

type PackageType = 'free' | 'basic' | 'premium';

interface PackageOption {
  type: PackageType;
  name: string;
  price: number;
  features: string[];
}

const packages: PackageOption[] = [
  {
    type: 'free',
    name: '免费版',
    price: 0,
    features: ['标清图片', '可直接保存', '基础功能'],
  },
  {
    type: 'basic',
    name: '9.9元尝鲜包',
    price: 9.9,
    features: ['高清无水印', '3-5人合成', '热门模板'],
  },
  {
    type: 'premium',
    name: '29.9元尊享包',
    price: 29.9,
    features: ['4K原图', '微动态', '贺卡', '全模板', '优先队列'],
  }
];

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onComplete,
  generationId 
}) => {
  const { user } = useUser();
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('free');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  
  const handleSelectPackage = (packageType: PackageType) => {
    setSelectedPackage(packageType);
    setError(null);
  };
  
  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');
    setError(null);
    
    try {
      // 免费版直接完成
      if (selectedPackage === 'free') {
        setTimeout(() => {
          setIsProcessing(false);
          setPaymentStatus('success');
          setTimeout(() => {
            onComplete();
          }, 800);
        }, 300);
        return;
      }
      
      if (!user?.id) {
        setError('用户信息未加载，请刷新页面重试');
        setPaymentStatus('failed');
        setIsProcessing(false);
        return;
      }
      
      if (!generationId) {
        setError('生成记录ID缺失，请重新生成');
        setPaymentStatus('failed');
        setIsProcessing(false);
        return;
      }
      
      // 创建支付订单
      const orderResponse = await createPaymentOrder(user.id, generationId, selectedPackage);
      
      if (!orderResponse.success || !orderResponse.data?.orderId) {
        throw new Error('创建支付订单失败');
      }
      
      const newOrderId = orderResponse.data.orderId;
      setOrderId(newOrderId);
      
      // 发起微信支付
      const paymentResponse = await initiateWeChatPayment(newOrderId, 'test_openid');
      
      if (!paymentResponse.success) {
        throw new Error('发起支付失败');
      }
      
      // 模拟支付过程（实际环境中应调用微信JSAPI）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 轮询订单状态
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkOrderStatus = async (): Promise<boolean> => {
        attempts++;
        
        try {
          const statusResponse = await getPaymentOrderStatus(newOrderId);
          
          if (statusResponse.success && statusResponse.data) {
            const status = statusResponse.data.status;
            
            if (status === 'paid') {
              return true;
            } else if (status === 'failed') {
              throw new Error('支付失败，请重试');
            }
          }
          
          if (attempts >= maxAttempts) {
            throw new Error('支付超时，请稍后查看订单状态');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          return checkOrderStatus();
        } catch (error) {
          throw error;
        }
      };
      
      const paymentSuccess = await checkOrderStatus();
      
      if (paymentSuccess) {
        setIsProcessing(false);
        setPaymentStatus('success');
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    } catch (error: any) {
      console.error('支付过程失败:', error);
      setError(error.message || '支付失败，请重试');
      setPaymentStatus('failed');
      setIsProcessing(false);
    }
  };
  
  const handleRetry = () => {
    setError(null);
    setPaymentStatus('idle');
    handlePayment();
  };
  
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
            transition={{ duration: 0.3 }}
          />
          
          {/* 弹窗内容 - 春节风格 */}
          <motion.div
            className="relative bg-gradient-to-b from-[#FFF8F0] to-white w-full max-w-md z-10 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 顶部装饰条 - 红金渐变 */}
            <div className="h-1.5 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B] rounded-t-2xl" />
            
            {/* 顶部装饰元素 */}
            <div className="absolute top-4 left-4 text-2xl opacity-60">🧧</div>
            <div className="absolute top-4 right-4 text-2xl opacity-60">🧧</div>
            
            <div className="p-6 pt-10">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-[#D4302B] mb-2">🎊 选择套餐</h3>
                <p className="text-gray-500 text-sm">解锁更多功能，获得更好体验</p>
              </div>
            
              {/* 套餐选项 */}
              <div className="space-y-3 mb-6">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage === pkg.type;
                  const isFree = pkg.type === 'free';
                  const isPremium = pkg.type === 'premium';
                  
                  return (
                    <motion.div
                      key={pkg.type}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all border-2 ${
                        isSelected
                          ? isFree 
                            ? 'border-[#D4302B] bg-white shadow-lg'
                            : 'border-[#FFD700] shadow-xl'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${
                        !isFree && isSelected
                          ? isPremium 
                            ? 'bg-gradient-to-br from-[#D4AF37]/20 to-[#FFD700]/10'
                            : 'bg-gradient-to-br from-[#D4302B]/10 to-[#FF6B6B]/5'
                          : ''
                      }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectPackage(pkg.type)}
                    >
                      {/* 推荐标签 */}
                      {isPremium && (
                        <div className="absolute -top-2 -right-2 bg-[#D4302B] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white">
                          🔥 85%选择
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className={`font-bold text-lg ${isFree ? 'text-gray-800' : 'text-[#8B0000]'}`}>
                            {pkg.name}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pkg.features.map((feature, index) => (
                              <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <span className={`text-2xl font-bold ${isFree ? 'text-gray-600' : 'text-[#D4302B]'}`}>
                            {pkg.price === 0 ? '免费' : `¥${pkg.price}`}
                          </span>
                        </div>
                      </div>
                      
                      {/* 选中指示器 */}
                      {isSelected && (
                        <motion.div 
                          className="absolute top-3 left-3 w-5 h-5 bg-[#D4302B] rounded-full flex items-center justify-center shadow"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <span className="text-white text-xs">✓</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            
              {/* 错误提示 */}
              {error && paymentStatus === 'failed' && (
                <motion.div 
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-2">⚠️</span>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </motion.div>
              )}
            
              {/* 支付成功提示 */}
              {paymentStatus === 'success' && (
                <motion.div 
                  className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center justify-center">
                    <span className="text-2xl mr-2">✅</span>
                    <p className="text-green-600 font-bold">操作成功</p>
                  </div>
                </motion.div>
              )}
            
              {/* 操作按钮 */}
              <motion.button
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center shadow-lg ${
                  isProcessing || paymentStatus === 'success'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : paymentStatus === 'failed'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    : selectedPackage === 'free'
                    ? 'bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white'
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#8B0000]'
                }`}
                whileTap={{ scale: (isProcessing || paymentStatus === 'success') ? 1 : 0.98 }}
                onClick={paymentStatus === 'failed' ? handleRetry : handlePayment}
                disabled={isProcessing || paymentStatus === 'success'}
              >
                {paymentStatus === 'processing' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>处理中...</span>
                  </>
                ) : paymentStatus === 'success' ? (
                  <>
                    <span className="text-xl mr-2">✓</span>
                    <span>成功</span>
                  </>
                ) : paymentStatus === 'failed' ? (
                  <span>重试</span>
                ) : (
                  <span>
                    {selectedPackage === 'free' ? '🎁 使用免费版' : '💳 立即支付'}
                  </span>
                )}
              </motion.button>
            
              {/* 取消按钮 */}
              {paymentStatus !== 'success' && (
                <button
                  className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-medium mt-3 hover:bg-gray-200 transition-colors"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  取消
                </button>
              )}
            
              {/* 支付说明 */}
              <div className="mt-4 text-center text-xs text-gray-400">
                <p>支付即表示同意《用户协议》和《隐私政策》</p>
                {orderId && <p className="mt-1">订单号: {orderId}</p>}
              </div>
            
              {/* 安全标识 */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-gray-500">微信支付安全加密</span>
              </div>
            </div>
            
            {/* 底部装饰 */}
            <div className="h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B] rounded-b-2xl" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
