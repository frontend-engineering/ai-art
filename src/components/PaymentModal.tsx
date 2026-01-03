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
  color: string;
}

const packages: PackageOption[] = [
  {
    type: 'free',
    name: '免费版',
    price: 0,
    features: ['生成1张艺术照', '带水印', '标准清晰度'],
    color: 'bg-gray-500'
  },
  {
    type: 'basic',
    name: '尝鲜包',
    price: 9.9,
    features: ['4选1生成', '无水印', '高清下载', '3次重生成'],
    color: 'bg-blue-500'
  },
  {
    type: 'premium',
    name: '尊享包',
    price: 29.9,
    features: ['4选1生成', '无水印', '高清下载', '无限重生成', '微动态生成', '实体产品优惠'],
    color: 'bg-purple-500'
  }
];

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onComplete,
  generationId 
}) => {
  const { user } = useUser();
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  
  const handleSelectPackage = (packageType: PackageType) => {
    setSelectedPackage(packageType);
    setError(null);
  };
  
  const handlePayment = async () => {
    if (!user?.id) {
      setError('用户信息未加载，请刷新页面重试');
      setPaymentStatus('failed');
      return;
    }
    
    if (!generationId) {
      setError('生成记录ID缺失，请重新生成');
      setPaymentStatus('failed');
      return;
    }
    
    setIsProcessing(true);
    setPaymentStatus('processing');
    setError(null);
    
    try {
      // 如果选择免费版，直接完成
      if (selectedPackage === 'free') {
        setTimeout(() => {
          setIsProcessing(false);
          setPaymentStatus('success');
          setTimeout(() => {
            onComplete();
          }, 1500);
        }, 500);
        return;
      }
      
      // 1. 创建支付订单
      console.log('创建支付订单...', { userId: user.id, generationId, packageType: selectedPackage });
      const orderResponse = await createPaymentOrder(user.id, generationId, selectedPackage);
      
      if (!orderResponse.success || !orderResponse.data?.orderId) {
        throw new Error('创建支付订单失败');
      }
      
      const newOrderId = orderResponse.data.orderId;
      setOrderId(newOrderId);
      console.log('支付订单创建成功:', newOrderId);
      
      // 2. 发起微信支付
      // 注意：在实际生产环境中，需要获取用户的openid
      // 这里使用测试openid
      console.log('发起微信支付...', { orderId: newOrderId });
      const paymentResponse = await initiateWeChatPayment(newOrderId, 'test_openid');
      
      if (!paymentResponse.success) {
        throw new Error('发起支付失败');
      }
      
      console.log('微信支付发起成功:', paymentResponse.data);
      
      // 3. 在实际环境中，这里应该调用微信JSAPI唤起支付
      // 由于是开发环境，我们模拟支付成功
      // 在生产环境中，应该使用 wx.chooseWXPay() 或类似的API
      
      // 模拟支付过程
      console.log('模拟支付过程...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. 轮询订单状态
      console.log('轮询订单状态...');
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 1000; // 1秒
      
      const checkOrderStatus = async (): Promise<boolean> => {
        attempts++;
        
        try {
          const statusResponse = await getPaymentOrderStatus(newOrderId);
          
          if (statusResponse.success && statusResponse.data) {
            const status = statusResponse.data.status;
            console.log(`订单状态: ${status} (尝试 ${attempts}/${maxAttempts})`);
            
            if (status === 'paid') {
              console.log('支付成功！');
              return true;
            } else if (status === 'failed') {
              throw new Error('支付失败，请重试');
            }
          }
          
          if (attempts >= maxAttempts) {
            throw new Error('支付超时，请稍后查看订单状态');
          }
          
          // 继续轮询
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return checkOrderStatus();
        } catch (error) {
          console.error('查询订单状态失败:', error);
          throw error;
        }
      };
      
      const paymentSuccess = await checkOrderStatus();
      
      if (paymentSuccess) {
        setIsProcessing(false);
        setPaymentStatus('success');
        // 显示成功状态1.5秒后关闭弹窗
        setTimeout(() => {
          onComplete();
        }, 1500);
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
          {/* 半透明背景 - 不可点击外部关闭 */}
          <motion.div 
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            className="relative bg-white w-full max-w-md z-10 max-h-[90vh] overflow-y-auto"
            style={{ borderRadius: '12px' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {/* 红色边框顶部装饰 */}
            <div className="h-1 bg-gradient-to-r from-[#D4302B] via-[#FF6B6B] to-[#D4302B] rounded-t-[12px]" />
            
            <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-[#6B5CA5] mb-2">选择套餐</h3>
              <p className="text-gray-500">解锁更多功能，获得更好体验</p>
            </div>
            
            {/* 套餐选项 */}
            <div className="space-y-4 mb-6">
              {packages.map((pkg) => (
                <motion.div
                  key={pkg.type}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedPackage === pkg.type
                      ? 'border-[#6B5CA5] bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPackage(pkg.type)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        selectedPackage === pkg.type ? 'bg-[#6B5CA5]' : 'bg-gray-300'
                      }`} />
                      <div>
                        <h4 className="font-bold text-lg">{pkg.name}</h4>
                        {pkg.type === 'premium' && (
                          <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                            推荐
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#6B5CA5]">
                        {pkg.price === 0 ? '免费' : `¥${pkg.price}`}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
            
            {/* 错误提示 */}
            {error && paymentStatus === 'failed' && (
              <motion.div 
                className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div className="flex-1">
                    <p className="text-red-600 font-medium mb-2">支付失败，请重试</p>
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* 支付成功提示 */}
            {paymentStatus === 'success' && (
              <motion.div 
                className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center justify-center">
                  <span className="text-3xl mr-3">✓</span>
                  <p className="text-green-600 font-bold text-lg">支付成功</p>
                </div>
              </motion.div>
            )}
            
            {/* 支付按钮 */}
            <motion.button
              className={`w-full py-4 rounded-xl font-medium flex items-center justify-center text-lg ${
                isProcessing || paymentStatus === 'success'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : paymentStatus === 'failed'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  : 'bg-gradient-to-r from-[#6B5CA5] to-[#9B8AC4] text-white'
              }`}
              whileTap={{ scale: (isProcessing || paymentStatus === 'success') ? 1 : 0.98 }}
              onClick={paymentStatus === 'failed' ? handleRetry : handlePayment}
              disabled={isProcessing || paymentStatus === 'success'}
            >
              {paymentStatus === 'processing' ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>支付处理中...</span>
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <span className="text-2xl mr-2">✓</span>
                  <span>支付成功</span>
                </>
              ) : paymentStatus === 'failed' ? (
                <>
                  <span className="text-xl mr-2">⚠️</span>
                  <span>重试支付</span>
                </>
              ) : (
                <span>
                  {selectedPackage === 'free' ? '使用免费版' : '立即支付'}
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
              {orderId && (
                <p className="mt-1">订单号: {orderId}</p>
              )}
            </div>
            
            {/* 微信支付安全加密信任标识 */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-500">微信支付安全加密</span>
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;