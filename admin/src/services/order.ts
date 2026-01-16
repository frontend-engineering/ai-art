import api from './api';

export interface PaymentOrder {
  id: string;
  user_id: string;
  generation_id?: string;
  amount: number;
  package_type: 'free' | 'basic' | 'premium';
  payment_method: string;
  trade_type: string;
  transaction_id?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  order_type: 'payment';
}

export interface ProductOrder {
  id: string;
  user_id: string;
  generation_id: string;
  product_type: 'crystal' | 'scroll';
  amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  status: 'pending' | 'paid' | 'exported' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  order_type: 'product';
}

export type Order = PaymentOrder | ProductOrder;

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  orderType?: 'payment' | 'product' | 'all';
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderStats {
  payment: {
    total_count: number;
    paid_count: number;
    total_amount: number;
    avg_amount: number;
  };
  product: {
    total_count: number;
    paid_count: number;
    total_amount: number;
  };
  daily: Array<{
    date: string;
    order_count: number;
    daily_amount: number;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// 获取订单列表
export const getOrderList = async (params: OrderListParams): Promise<OrderListResponse> => {
  const response = await api.get<any, ApiResponse<OrderListResponse>>('/orders', { params });
  return response.data;
};

// 获取订单详情
export const getOrderDetail = async (id: string, orderType?: 'payment' | 'product'): Promise<Order> => {
  const response = await api.get<any, ApiResponse<Order>>(`/orders/${id}`, {
    params: { orderType }
  });
  return response.data;
};

// 更新订单状态
export const updateOrderStatus = async (id: string, status: string, orderType: 'payment' | 'product') => {
  const response = await api.put<any, ApiResponse<any>>(`/orders/${id}/status`, { status, orderType });
  return response;
};

// 订单退款
export const refundOrder = async (id: string, reason: string) => {
  const response = await api.post<any, ApiResponse<any>>(`/orders/${id}/refund`, { reason });
  return response;
};

// 导出订单数据
export const exportOrderData = async (orderType: 'payment' | 'product' | 'all', startDate?: string, endDate?: string) => {
  const response = await api.get('/orders/export/data', {
    params: { orderType, startDate, endDate },
    responseType: 'blob'
  });
  
  // 创建下载链接
  const blob = response as unknown as Blob;
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `orders_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// 获取订单统计
export const getOrderStats = async (startDate?: string, endDate?: string): Promise<OrderStats> => {
  const response = await api.get<any, ApiResponse<OrderStats>>('/orders/stats/overview', {
    params: { startDate, endDate }
  });
  return response.data;
};
