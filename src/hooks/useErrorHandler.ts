/**
 * 错误处理 Hook
 * 提供统一的错误处理和显示机制
 */

import { useState, useCallback } from 'react';
import { getFriendlyError, type FriendlyError } from '@/lib/errorMessages';

interface UseErrorHandlerReturn {
  error: FriendlyError | null;
  showError: (error: string | Error) => void;
  clearError: () => void;
  retryAction: (() => void) | null;
  setRetryAction: (action: (() => void) | null) => void;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<FriendlyError | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  const showError = useCallback((errorInput: string | Error) => {
    const friendlyError = getFriendlyError(errorInput);
    setError(friendlyError);
    
    // 记录错误到控制台（用于调试）
    console.error('[Error Handler]', errorInput);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryAction(null);
  }, []);

  return {
    error,
    showError,
    clearError,
    retryAction,
    setRetryAction
  };
}
