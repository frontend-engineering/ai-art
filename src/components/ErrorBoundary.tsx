/**
 * 错误边界组件
 * 捕获 React 组件树中的错误，防止整个应用崩溃
 */

import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到控制台
    console.error('[Error Boundary] 捕获到错误:', error, errorInfo);
    
    // 这里可以将错误发送到错误监控服务
    // 例如: Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
    
    // 刷新页面
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF8F0] to-[#FFE8E0] p-4">
          <motion.div
            className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              border: '3px solid #D4302B'
            }}
          >
            {/* Emoji */}
            <div className="text-7xl mb-4">😕</div>

            {/* 标题 */}
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              哎呀，出错了
            </h1>

            {/* 消息 */}
            <p className="text-gray-600 mb-6">
              应用遇到了一个意外错误
            </p>

            {/* 错误详情（开发环境） */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-sm font-mono text-red-700 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* 解决方案 */}
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 mb-6">
              <div className="flex items-start">
                <span className="text-2xl mr-3">💡</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    解决方案
                  </p>
                  <p className="text-sm text-blue-700">
                    刷新页面重试，如果问题持续出现，请联系客服
                  </p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gradient-to-r from-[#D4302B] to-[#E84A3D] text-white rounded-xl font-bold hover:shadow-xl transition-all active:scale-95"
              >
                刷新页面
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border-2 border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
              >
                返回上一页
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
