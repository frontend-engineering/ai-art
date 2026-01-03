/**
 * Component Showcase
 * 
 * This file demonstrates the usage of all standardized interactive components.
 * Use this as a reference when implementing new features.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loading from './Loading';
import Toast, { ToastType } from './Toast';
import ProgressBar from './ProgressBar';

const ComponentShowcase: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<ToastType>('success');
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowToast = (type: ToastType) => {
    setToastType(type);
    setShowToast(true);
  };

  const handleStartProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#D4302B] mb-2">
            Interactive Components Showcase
          </h1>
          <p className="text-gray-600">
            统一交互组件规范示例
          </p>
        </div>

        {/* Buttons Section */}
        <section className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Buttons (按钮)</h2>
          
          <div className="space-y-4">
            {/* Primary Buttons */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Primary Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn-festival btn-primary px-6 py-3">
                  立即生成
                </button>
                <button className="btn-festival btn-primary px-6 py-3" disabled>
                  禁用状态
                </button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Secondary Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn-festival btn-secondary px-6 py-3">
                  取消
                </button>
                <button className="btn-festival btn-secondary px-6 py-3" disabled>
                  禁用状态
                </button>
              </div>
            </div>

            {/* Function Buttons */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Function Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn-festival btn-function btn-function-gold px-6 py-3">
                  <i className="fas fa-download mr-2"></i>
                  下载高清图
                </button>
                <button className="btn-festival btn-function btn-function-purple px-6 py-3">
                  <i className="fas fa-image mr-2"></i>
                  定制晶瓷画
                </button>
                <button className="btn-festival btn-function btn-function-gray px-6 py-3">
                  <i className="fas fa-share-alt mr-2"></i>
                  分享
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Modal Section */}
        <section className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Modal (弹窗)</h2>
          
          <button 
            className="btn-festival btn-primary px-6 py-3"
            onClick={() => setShowModal(true)}
          >
            打开弹窗
          </button>

          <AnimatePresence>
            {showModal && (
              <div className="modal-festival-overlay clickable" onClick={() => setShowModal(false)}>
                <motion.div
                  className="modal-festival max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <button 
                    className="modal-festival-close"
                    onClick={() => setShowModal(false)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                  
                  <div className="modal-festival-content">
                    <h3 className="modal-festival-title">示例弹窗</h3>
                    <p className="text-gray-600 mb-4">
                      这是一个标准化的弹窗组件，具有红色顶部装饰、圆角设计和平滑的淡入淡出动画。
                    </p>
                    <button 
                      className="btn-festival btn-primary w-full py-3"
                      onClick={() => setShowModal(false)}
                    >
                      确定
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* Loading Section */}
        <section className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Loading (加载)</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Different Sizes</h3>
              <div className="flex items-end gap-8">
                <div className="text-center">
                  <Loading size="small" text="小" />
                </div>
                <div className="text-center">
                  <Loading size="medium" text="中" />
                </div>
                <div className="text-center">
                  <Loading size="large" text="大" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Toggle Loading</h3>
              <button 
                className="btn-festival btn-secondary px-6 py-3"
                onClick={() => setIsLoading(!isLoading)}
              >
                {isLoading ? '停止加载' : '开始加载'}
              </button>
              {isLoading && (
                <div className="mt-4">
                  <Loading text="加载中..." />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Toast Section */}
        <section className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Toast (提示)</h2>
          
          <div className="flex flex-wrap gap-3">
            <button 
              className="btn-festival btn-function btn-function-gold px-6 py-3"
              onClick={() => handleShowToast('success')}
            >
              成功提示
            </button>
            <button 
              className="btn-festival btn-function btn-function-purple px-6 py-3"
              onClick={() => handleShowToast('error')}
            >
              错误提示
            </button>
            <button 
              className="btn-festival btn-function btn-function-gray px-6 py-3"
              onClick={() => handleShowToast('info')}
            >
              引导提示
            </button>
          </div>

          {showToast && (
            <div className="mt-4">
              <Toast
                type={toastType}
                message={
                  toastType === 'success' 
                    ? '操作成功！' 
                    : toastType === 'error' 
                    ? '操作失败，请重试' 
                    : '这是一条引导信息'
                }
                duration={3000}
                onClose={() => setShowToast(false)}
              />
            </div>
          )}
        </section>

        {/* Progress Bar Section */}
        <section className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Progress Bar (进度条)</h2>
          
          <div className="space-y-4">
            <button 
              className="btn-festival btn-primary px-6 py-3"
              onClick={handleStartProgress}
            >
              开始进度
            </button>
            
            <ProgressBar progress={progress} showText={true} />
            
            <div className="text-sm text-gray-600">
              当前进度: {progress}%
            </div>
          </div>
        </section>

        {/* Design Tokens */}
        <section className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Design Tokens (设计令牌)</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-full h-20 bg-[#D4302B] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Festival Red</p>
              <p className="text-xs text-gray-500">#D4302B</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-[#D4AF37] rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Festival Gold</p>
              <p className="text-xs text-gray-500">#D4AF37</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-[#FFF8F0] border-2 border-gray-200 rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Festival Warm</p>
              <p className="text-xs text-gray-500">#FFF8F0</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ComponentShowcase;
