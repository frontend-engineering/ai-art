import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  type, 
  message, 
  duration = 3000,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Wait for exit animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const getToastClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-info';
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span className="toast-success-icon">✓</span>;
      case 'error':
        return <span className="toast-error-icon">⚠️</span>;
      case 'info':
        return <span className="toast-info-icon">i</span>;
      default:
        return null;
    }
  };
  
  const getTextClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success-text';
      case 'error':
        return 'toast-error-text';
      case 'info':
        return 'toast-info-text';
      default:
        return 'toast-info-text';
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={getToastClass()}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {getIcon()}
          <span className={getTextClass()}>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
