import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// 图片加载组件
const ImageWithLoading: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className="relative">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF8DC] to-[#F4E4C1] z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-3xl"
            >
              🏮
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

interface ProductRecommendationProps {
  isOpen: boolean;
  selectedImage: string;
  onClose: () => void;
  onSkipAndDownload?: () => void;
  onOrderProduct: (productType: 'crystal' | 'scroll', shippingInfo: ShippingInfo) => void;
}

interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
}

type ProductType = 'crystal' | 'scroll';

interface Product {
  type: ProductType;
  name: string;
  price: number;
  description: string;
  features: string[];
}

const products: Product[] = [
  {
    type: 'crystal',
    name: '晶瓷画',
    price: 199,
    description: '高端晶瓷材质，色彩鲜艳，永不褪色',
    features: ['30x40cm尺寸', '晶瓷材质', '防水防潮', '赠送挂钩'],
  },
  {
    type: 'scroll',
    name: '卷轴',
    price: 149,
    description: '传统卷轴工艺，古典雅致，适合中式装修',
    features: ['40x60cm尺寸', '绸缎材质', '实木轴头', '赠送挂绳'],
  }
];

const ProductRecommendation: React.FC<ProductRecommendationProps> = ({
  isOpen,
  selectedImage,
  onClose,
  onSkipAndDownload,
  onOrderProduct
}) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectProduct = (productType: ProductType) => {
    setSelectedProduct(productType);
  };
  
  const handlePreview = () => {
    if (!selectedProduct) {
      toast.error('请先选择一个产品');
      return;
    }
    setShowPreview(true);
  };
  
  const handleOrder = () => {
    if (!selectedProduct) {
      toast.error('请先选择一个产品');
      return;
    }
    setShowPreview(false);
    setShowOrderForm(true);
  };

  const handleSubmitOrder = async () => {
    if (!selectedProduct) return;

    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      toast.error('请填写完整的收货信息');
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(shippingInfo.phone)) {
      toast.error('请输入正确的手机号');
      return;
    }

    setIsSubmitting(true);
    try {
      await onOrderProduct(selectedProduct, shippingInfo);
      setShippingInfo({ name: '', phone: '', address: '' });
      setShowOrderForm(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('提交订单失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (showPreview) {
      setShowPreview(false);
    } else {
      setShowOrderForm(false);
      setSelectedProduct(null);
    }
  };

  // 暂不购买，直接关闭
  const handleSkip = () => {
    if (onSkipAndDownload) {
      onSkipAndDownload();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* 半透明背景 */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 弹窗内容 - 春节风格 */}
          <motion.div
            className="relative bg-gradient-to-b from-[#FFF8F0] to-white w-full max-w-md z-10 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* 顶部装饰条 - 红金渐变 */}
            <div className="h-1.5 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B] rounded-t-2xl sm:rounded-t-2xl" />
            
            {/* 顶部装饰元素 */}
            <div className="absolute top-3 left-4 text-2xl opacity-60">🏮</div>
            <div className="absolute top-3 right-4 text-2xl opacity-60">🏮</div>

            {showPreview ? (
              // 产品预览界面
              <div className="p-6 pt-8">
                <div className="flex items-center mb-6">
                  <button
                    onClick={handleBack}
                    className="text-[#D4302B] flex items-center font-medium"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    返回
                  </button>
                  <h3 className="text-xl font-bold text-[#D4302B] ml-4">
                    ✨ 产品预览
                  </h3>
                </div>

                {/* 产品预览图 */}
                <div className="mb-6">
                  <div className="relative bg-gradient-to-br from-[#FFF8DC] to-[#F5E6D3] rounded-xl p-6 border-2 border-[#D4AF37]/30">
                    {selectedProduct === 'crystal' ? (
                      <div className="relative">
                        <div className="border-8 border-white shadow-2xl rounded-lg overflow-hidden">
                          <ImageWithLoading
                            src={selectedImage}
                            alt="晶瓷画预览"
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#D4302B] text-white px-3 py-1 rounded-full shadow-lg text-sm font-medium">
                          30×40cm
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="h-5 bg-gradient-to-r from-[#8B4513] via-[#D2691E] to-[#8B4513] rounded-t-lg shadow-md"></div>
                        <div className="bg-gradient-to-b from-[#FFF8DC] to-[#F5DEB3] p-4 shadow-xl border-x-4 border-[#D4AF37]/50">
                          <ImageWithLoading
                            src={selectedImage}
                            alt="卷轴预览"
                            className="w-full h-auto rounded"
                          />
                        </div>
                        <div className="h-5 bg-gradient-to-r from-[#8B4513] via-[#D2691E] to-[#8B4513] rounded-b-lg shadow-md"></div>
                        <div className="absolute -bottom-2 -right-2 bg-[#D4302B] text-white px-3 py-1 rounded-full shadow-lg text-sm font-medium">
                          40×60cm
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 产品信息 */}
                {selectedProduct && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-[#D4302B]/10 to-[#FFD700]/10 rounded-xl border border-[#D4302B]/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg text-[#8B0000]">
                        {products.find((p) => p.type === selectedProduct)?.name}
                      </h4>
                      <span className="text-2xl font-bold text-[#D4302B]">
                        ¥{products.find((p) => p.type === selectedProduct)?.price}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {products.find((p) => p.type === selectedProduct)?.description}
                    </p>
                    <ul className="space-y-1">
                      {products
                        .find((p) => p.type === selectedProduct)
                        ?.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <span className="text-[#D4302B] mr-2">✓</span>
                            {feature}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-3">
                  <motion.button
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white font-bold text-lg shadow-lg"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOrder}
                  >
                    🎁 立即下单
                  </motion.button>
                  <button
                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                    onClick={handleBack}
                  >
                    返回选择
                  </button>
                </div>
              </div>
            ) : !showOrderForm ? (
              // 产品选择界面
              <div className="p-6 pt-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-[#D4302B] mb-2">
                    🎊 新春特惠
                  </h3>
                  <p className="text-gray-600">
                    将您的艺术照制作成精美实物，挂在家中更有年味
                  </p>
                </div>

                {/* 预览图片 */}
                <div className="mb-6 rounded-xl overflow-hidden border-4 border-[#D4AF37]/50 shadow-lg">
                  <ImageWithLoading
                    src={selectedImage}
                    alt="您的作品"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* 产品列表 */}
                <div className="space-y-4 mb-6">
                  {products.map((product) => (
                    <motion.div
                      key={product.type}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all border-2 ${
                        selectedProduct === product.type
                          ? 'border-[#D4302B] bg-gradient-to-r from-[#D4302B]/5 to-[#FFD700]/5 shadow-lg'
                          : 'border-gray-200 hover:border-[#D4AF37] bg-white'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectProduct(product.type)}
                    >
                      {/* 选中标记 */}
                      {selectedProduct === product.type && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#D4302B] rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-[#8B0000]">{product.name}</h4>
                          <p className="text-sm text-gray-600">{product.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-[#D4302B]">
                            ¥{product.price}
                          </span>
                        </div>
                      </div>
                      <ul className="flex flex-wrap gap-2">
                        {product.features.map((feature, index) => (
                          <li key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className="space-y-3">
                  <motion.button
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                      selectedProduct
                        ? 'bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    whileTap={{ scale: selectedProduct ? 0.98 : 1 }}
                    onClick={handlePreview}
                    disabled={!selectedProduct}
                  >
                    {selectedProduct ? '👀 预览效果' : '请先选择产品'}
                  </motion.button>
                  <button
                    className="w-full py-3 rounded-xl bg-white border-2 border-[#D4AF37] text-[#8B4513] font-medium hover:bg-[#FFF8DC] transition-colors"
                    onClick={handleSkip}
                  >
                    暂不需要，直接保存图片
                  </button>
                </div>
              </div>
            ) : (
              // 订单表单界面
              <div className="p-6 pt-8">
                <div className="flex items-center mb-6">
                  <button
                    onClick={handleBack}
                    className="text-[#D4302B] flex items-center font-medium"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    返回
                  </button>
                  <h3 className="text-xl font-bold text-[#D4302B] ml-4">
                    📦 填写收货信息
                  </h3>
                </div>

                {/* 选中的产品信息 */}
                {selectedProduct && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-[#D4302B]/10 to-[#FFD700]/10 rounded-xl border border-[#D4302B]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[#8B0000]">
                          {products.find((p) => p.type === selectedProduct)?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {products.find((p) => p.type === selectedProduct)?.description}
                        </p>
                      </div>
                      <span className="text-xl font-bold text-[#D4302B]">
                        ¥{products.find((p) => p.type === selectedProduct)?.price}
                      </span>
                    </div>
                  </div>
                )}

                {/* 收货信息表单 */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      收货人姓名 <span className="text-[#D4302B]">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.name}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, name: e.target.value })
                      }
                      placeholder="请输入收货人姓名"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4302B] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话 <span className="text-[#D4302B]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, phone: e.target.value })
                      }
                      placeholder="请输入11位手机号"
                      maxLength={11}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4302B] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      收货地址 <span className="text-[#D4302B]">*</span>
                    </label>
                    <textarea
                      value={shippingInfo.address}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, address: e.target.value })
                      }
                      placeholder="请输入详细收货地址（省市区+街道+门牌号）"
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4302B] resize-none transition-colors"
                    />
                  </div>
                </div>

                {/* 提交按钮 */}
                <motion.button
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center shadow-lg ${
                    isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#D4302B] to-[#B82820] text-white'
                  }`}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
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
                      <span>提交中...</span>
                    </>
                  ) : (
                    <span>🎁 提交订单</span>
                  )}
                </motion.button>

                {/* 说明文字 */}
                <div className="mt-4 text-center text-xs text-gray-400">
                  <p>提交订单后，我们将在1-2个工作日内与您联系确认</p>
                  <p className="mt-1">制作周期约7-10个工作日，春节期间可能延长</p>
                </div>
              </div>
            )}
            
            {/* 底部装饰 */}
            <div className="h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductRecommendation;
