/**
 * 用户管理服务
 */

import api from './api';

export interface User {
  id: string;
  openid: string | null;
  payment_status: 'free' | 'basic' | 'premium';
  regenerate_count: number;
  created_at: string;
  updated_at: string;
  generation_count: number;
  order_count: number;
}

export interface UserDetail extends User {
  generations: Generation[];
  orders: Order[];
}

export interface Generation {
  id: string;
  mode: string;
  template_id: string | null;
  status: string;
  result_url: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  amount: number;
  package_type: string;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  created_at: string;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  paymentStatus?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取用户列表
 */
export const getUserList = async (params: UserListParams): Promise<UserListResponse> => {
  const response = await api.get('/admin-api/users', { params });
  return response.data.data;
};

/**
 * 获取用户详情
 */
export const getUserDetail = async (id: string): Promise<UserDetail> => {
  const response = await api.get(`/admin-api/users/${id}`);
  return response.data.data;
};

/**
 * 更新用户付费状态
 */
export const updateUserPaymentStatus = async (
  id: string,
  paymentStatus: 'free' | 'basic' | 'premium'
): Promise<void> => {
  await api.put(`/admin-api/users/${id}/payment-status`, { paymentStatus });
};

/**
 * 导出用户数据
 */
export const exportUsers = async (params: UserListParams): Promise<Blob> => {
  const response = await api.get('/admin-api/users/export/data', {
    params,
    responseType: 'blob'
  });
  return response.data;
};
