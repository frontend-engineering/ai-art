/**
 * 价格配置服务
 */

import api from './api';

export interface PriceConfig {
  id: number;
  package_type: string;
  price: number;
  effective_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: number;
  price_config_id: number;
  old_price: number | null;
  new_price: number;
  changed_by: string;
  changed_at: string;
  reason: string;
  package_type?: string;
  effective_date?: string;
}

export interface CreatePriceData {
  packageType: string;
  price: number;
  effectiveDate: string;
}

export interface UpdatePriceData {
  price?: number;
  effectiveDate?: string;
  isActive?: boolean;
}

/**
 * 获取所有价格配置
 */
export const getAllPrices = async (): Promise<PriceConfig[]> => {
  const response = await api.get('/admin-api/prices');
  return response.data.data;
};

/**
 * 获取当前生效的价格
 */
export const getCurrentPrices = async (): Promise<Record<string, number>> => {
  const response = await api.get('/api/prices/current');
  return response.data.data;
};

/**
 * 创建价格配置
 */
export const createPrice = async (data: CreatePriceData): Promise<PriceConfig> => {
  const response = await api.post('/admin-api/prices', data);
  return response.data.data;
};

/**
 * 更新价格配置
 */
export const updatePrice = async (id: number, data: UpdatePriceData): Promise<PriceConfig> => {
  const response = await api.put(`/admin-api/prices/${id}`, data);
  return response.data.data;
};

/**
 * 获取价格历史记录
 */
export const getPriceHistory = async (id: number): Promise<PriceHistory[]> => {
  const response = await api.get(`/admin-api/prices/history/${id}`);
  return response.data.data;
};

/**
 * 获取套餐类型的价格历史
 */
export const getPriceHistoryByPackage = async (packageType: string): Promise<PriceHistory[]> => {
  const response = await api.get(`/admin-api/prices/history/package/${packageType}`);
  return response.data.data;
};

/**
 * 停用价格配置
 */
export const deactivatePrice = async (id: number): Promise<void> => {
  await api.delete(`/admin-api/prices/${id}`);
};
