import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductRecommendationProps {
  isOpen: boolean;
  selectedImage: string;
  onClose: () => void;
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
  image: string;
}

const products: Product[] = [
  {
    type: 'crystal',
    name: '晶瓷画',
    price: 199,
    description: '高端晶瓷材质，色彩鲜艳，永不褪色',
    features: ['30x40cm尺寸', '晶瓷材质', '防水防潮', '赠送挂钩'],
    image: '/products/crystal.jpg'
  },
  {
    type: 'scroll',
    name: '卷轴',
    price: 149,
    description: '传统卷轴工艺，古典雅致，适合中式装修',
    features: ['40x60cm尺寸', '绸缎材质', '实木轴头', '赠送挂绳'],
    image: '/products/scroll.jpg'
  }
];

const ProductRecommendation: React.FC<ProductRecommendationProps> = ({
  isOpen,
  selectedImage,
  onClose,
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
      alert('请先选择一个产品');
      return;
    }
    setShowPreview(true);
  };
  
  const handleOrder = () => {
    if (!selectedProduct) {
      alert('请先选择一个产品');
      return;
    }
    setShowPreview(false);
    setShowOrderForm(true);
  };

  const handleSubmitOrder = async () => {
    if (!selectedProduct) return;

    // 验证表单
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      alert('请填写完整的收货信息');
      return;
    }

    // 验证手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(shippingInfo.phone)) {
      alert('请输入正确的手机号');
      return;
    }

    setIsSubmitting(true);
    try {
      await onOrderProduct(selectedProduct, shippingInfo);
      // 重置表单
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* 半透明背景 */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <motion.div
            className="bg-white rounded-t-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {showPreview ? (
              // 产品预览界面
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <button
                    onClick={handleBack}
                    className="text-[#6B5CA5] flex items-center"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    返回
                  </button>
                  <h3 className="text-xl font-bold text-[#6B5CA5] ml-4">
                    产品预览
                  </h3>
                </div>

                {/* 产品预览图 */}
                <div className="mb-6">
                  <div className="relative bg-gray-100 rounded-lg p-8">
                    {selectedProduct === 'crystal' ? (
                      // 晶瓷画预览 - 简单的相框效果
                      <div className="relative">
                        <div className="border-8 border-white shadow-2xl rounded-lg overflow-hidden">
                          <img
                            src={selectedImage}
                            alt="Product Preview"
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1 rounded-full shadow-lg text-sm font-medium text-[#6B5CA5]">
                          30x40cm
                        </div>
                      </div>
                    ) : (
                      // 卷轴预览 - 卷轴效果
                      <div className="relative">
                        {/* 上轴头 */}
                        <div className="h-4 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-t-lg shadow-md"></div>
                        {/* 卷轴主体 */}
                        <div className="bg-gradient-to-b from-amber-50 to-amber-100 p-4 shadow-xl">
                          <img
                            src={selectedImage}
                            alt="Product Preview"
                            className="w-full h-auto rounded"
                          />
                        </div>
                        {/* 下轴头 */}
                        <div className="h-4 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-b-lg shadow-md"></div>
                        <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1 rounded-full shadow-lg text-sm font-medium text-[#6B5CA5]">
                          40x60cm
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 产品信息 */}
                {selectedProduct && (
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">
                        {products.find((p) => p.type === selectedProduct)?.name}
                      </h4>
                      <span className="text-2xl font-bold text-[#6B5CA5]">
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
                            <span className="text-green-500 mr-2">✓</span>
                            {feature}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-3">
                  <motion.button
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#6B5CA5] to-[#9B8AC4] text-white font-medium"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOrder}
                  >
                    立即下单
                  </motion.button>
                  <button
                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-medium"
                    onClick={handleBack}
                  >
                    返回选择
                  </button>
                </div>
              </div>
            ) : !showOrderForm ? (
              // 产品选择界面
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-[#6B5CA5] mb-2">
                    制作实体产品
                  </h3>
                  <p className="text-gray-500">
                    将您的艺术照制作成精美的实体产品，挂在家中展示
                  </p>
                </div>

                {/* 预览图片 */}
                <div className="mb-6">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>

                {/* 产品列表 */}
                <div className="space-y-4 mb-6">
                  {products.map((product) => (
                    <motion.div
                      key={product.type}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                        selectedProduct === product.type
                          ? 'border-[#6B5CA5] bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectProduct(product.type)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg">{product.name}</h4>
                          <p className="text-sm text-gray-600">{product.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-[#6B5CA5]">
                            ¥{product.price}
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {product.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
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
                    className={`w-full py-4 rounded-xl font-medium ${
                      selectedProduct
                        ? 'bg-gradient-to-r from-[#6B5CA5] to-[#9B8AC4] text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    whileTap={{ scale: selectedProduct ? 0.98 : 1 }}
                    onClick={handlePreview}
                    disabled={!selectedProduct}
                  >
                    预览效果
                  </motion.button>
                  <button
                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-medium"
                    onClick={onClose}
                  >
                    暂不购买
                  </button>
                </div>
              </div>
            ) : (
              // 订单表单界面
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <button
                    onClick={handleBack}
                    className="text-[#6B5CA5] flex items-center"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    返回
                  </button>
                  <h3 className="text-xl font-bold text-[#6B5CA5] ml-4">
                    填写收货信息
                  </h3>
                </div>

                {/* 选中的产品信息 */}
                {selectedProduct && (
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">
                          {products.find((p) => p.type === selectedProduct)?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {products.find((p) => p.type === selectedProduct)?.description}
                        </p>
                      </div>
                      <span className="text-xl font-bold text-[#6B5CA5]">
                        ¥{products.find((p) => p.type === selectedProduct)?.price}
                      </span>
                    </div>
                  </div>
                )}

                {/* 收货信息表单 */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      收货人姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.name}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, name: e.target.value })
                      }
                      placeholder="请输入收货人姓名"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6B5CA5]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, phone: e.target.value })
                      }
                      placeholder="请输入11位手机号"
                      maxLength={11}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6B5CA5]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      收货地址 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={shippingInfo.address}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, address: e.target.value })
                      }
                      placeholder="请输入详细收货地址（省市区+街道+门牌号）"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#6B5CA5] resize-none"
                    />
                  </div>
                </div>

                {/* 提交按钮 */}
                <motion.button
                  className={`w-full py-4 rounded-xl font-medium flex items-center justify-center ${
                    isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#6B5CA5] to-[#9B8AC4] text-white'
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
                    <span>提交订单</span>
                  )}
                </motion.button>

                {/* 说明文字 */}
                <div className="mt-4 text-center text-xs text-gray-400">
                  <p>提交订单后，我们将在1-2个工作日内与您联系确认订单</p>
                  <p className="mt-1">制作周期约7-10个工作日</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductRecommendation;
