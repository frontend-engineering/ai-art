/**
 * 错误处理演示页面
 * 展示各种错误提示效果
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Background from '@/components/Background';
import FriendlyErrorToast from '@/components/FriendlyErrorToast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showFriendlyError, showFriendlyErrorModal } from '@/lib/utils';

export default function ErrorHandlingDemo() {
  const { error, showError, clearError, setRetryAction } = useErrorHandler();
  const [selectedErrorType, setSelectedErrorType] = useState<string>('');

  // 错误类型示例
  const errorExamples = [
    { type: 'face-not-found', message: '未检测到人脸', label: '人脸检测失败' },
    { type: 'face-blur', message: '照片模糊', label: '照片模糊' },
    { type: 'file-too-large', message: '文件太大', label: '文件过大' },
    { type: 'invalid-format', message: '格式不支持', label: '格式错误' },
    { type: 'upload-failed', message: '上传失败', label: '上传失败' },
    { type: 'generation-failed', message: '生成失败', label: '生成失败' },
    { type: 'timeout', message: '超时', label: '请求超时' },
    { type: 'queue-full', message: '队列满', label: '队列已满' },
    { type: 'payment-failed', message: '支付失败', label: '支付失败' },
    { type: 'network-error', message: '网络错误', label: '网络错误' },
    { type: 'server-error', message: '服务器错误 500', label: '服务器错误' },
    { type: 'permission-denied', message: '权限不足', label: '权限不足' },
    { type: 'quota-exceeded', message: '次数用完', label: '次数用完' },
    { type: 'default', message: '未知错误', label: '默认错误' },
  ];

  // 显示 Toast 错误
  const handleShowToastError = (message: string) => {
    showFriendlyError(message);
    setSelectedErrorType(message);
  };

  // 显示模态框错误
  const handleShowModalError = (message: string) => {
    const friendlyError = showFriendlyErrorModal(message);
    showError(message);
    setSelectedErrorType(message);
    
    // 设置重试动作
    if (friendlyError.retryable) {
      setRetryAction(() => () => {
        toast.success('重试成功！');
        clearError();
      });
    }
  };

  // 触发 React 错误边界
  const [shouldThrowError, setShouldThrowError] = useState(false);
  if (shouldThrowError) {
    throw new Error('这是一个测试错误，用于演示错误边界');
  }

  return (
    <div className="min-h-screen relative">
      <Background />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              错误处理演示
            </h1>
            <p className="text-gray-600">
              展示各种友好的错误提示效果
            </p>
          </div>

          {/* Toast 错误示例 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Toast 提示（Sonner）
            </h2>
            <p className="text-gray-600 mb-4">
              轻量级提示，适合非关键错误
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {errorExamples.map((example) => (
                <button
                  key={example.type}
                  onClick={() => handleShowToastError(example.message)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all active:scale-95"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          {/* 模态框错误示例 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              模态框提示（FriendlyErrorToast）
            </h2>
            <p className="text-gray-600 mb-4">
              强提示，适合关键错误，支持重试操作
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {errorExamples.map((example) => (
                <button
                  key={example.type}
                  onClick={() => handleShowModalError(example.message)}
                  className="px-4 py-2 bg-gradient-to-r from-[#D4302B] to-[#E84A3D] text-white rounded-lg hover:shadow-lg transition-all active:scale-95"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          {/* 错误边界示例 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              错误边界（Error Boundary）
            </h2>
            <p className="text-gray-600 mb-4">
              捕获 React 组件错误，防止应用崩溃
            </p>
            <button
              onClick={() => setShouldThrowError(true)}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all active:scale-95"
            >
              触发 React 错误
            </button>
          </div>

          {/* 当前选中的错误类型 */}
          {selectedErrorType && (
            <div className="mt-6 bg-gray-100 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                <strong>当前触发:</strong> {selectedErrorType}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* 友好错误提示模态框 */}
      <FriendlyErrorToast
        error={error}
        onClose={clearError}
        onRetry={() => {
          toast.success('重试成功！');
          clearError();
        }}
        duration={0} // 不自动关闭
      />
    </div>
  );
}
