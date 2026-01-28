import api from './api';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    email?: string;
  };
}

export interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
  status: string;
  last_login_at?: string;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * 登录
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  const response = await api.post<any, ApiResponse<LoginResponse>>('/auth/login', params);
  return response.data;
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<any, ApiResponse<User>>('/auth/me');
  return response.data;
}

/**
 * 修改密码
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { oldPassword, newPassword });
}
