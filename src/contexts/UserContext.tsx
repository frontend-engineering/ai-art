/**
 * 用户上下文
 * 管理用户会话状态
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserId } from '@/lib/auth';
import { userAPI, User } from '@/lib/api';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updatePaymentStatus: (status: 'free' | 'basic' | 'premium') => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化用户
  const initUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getUserId();
      console.log('初始化用户会话:', userId);
      
      // 调用后端API创建或获取用户
      const userData = await userAPI.initUser(userId);
      setUser(userData);
      
      console.log('用户会话初始化成功:', userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化用户失败';
      console.error('用户会话初始化失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      setError(null);
      
      const userId = getUserId();
      const userData = await userAPI.getUser(userId);
      setUser(userData);
      
      console.log('用户信息刷新成功:', userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刷新用户信息失败';
      console.error('刷新用户信息失败:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  // 更新用户付费状态
  const updatePaymentStatus = async (status: 'free' | 'basic' | 'premium') => {
    try {
      setError(null);
      
      const userId = getUserId();
      const userData = await userAPI.updatePaymentStatus(userId, status);
      setUser(userData);
      
      console.log('用户付费状态更新成功:', userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新付费状态失败';
      console.error('更新付费状态失败:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  // 组件挂载时初始化用户
  useEffect(() => {
    initUser();
  }, []);

  const value: UserContextType = {
    user,
    loading,
    error,
    refreshUser,
    updatePaymentStatus,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * 使用用户上下文的Hook
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
