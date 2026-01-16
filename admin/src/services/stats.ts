import api from './api';

export interface TodayStats {
  newUsers: number;
  revenue: number;
  orders: number;
  generations: number;
}

export interface TrendData {
  users: Array<{ date: string; count: number }>;
  revenue: Array<{ date: string; revenue: number }>;
  orders: Array<{ date: string; count: number }>;
  generations: Array<{ date: string; count: number }>;
}

export interface UserDistribution {
  status: string;
  count: number;
}

export interface PackageDistribution {
  package: string;
  count: number;
  revenue: number;
}

export interface PopularTemplate {
  template: string;
  count: number;
}

export interface DashboardData {
  today: TodayStats;
  trends: TrendData;
  userDistribution: UserDistribution[];
  packageDistribution: PackageDistribution[];
  popularTemplates: PopularTemplate[];
}

export interface RevenueStats {
  total: {
    orderCount: number;
    totalRevenue: number;
    avgRevenue: number;
  };
  byPackage: Array<{
    package: string;
    count: number;
    revenue: number;
  }>;
  byMethod: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
}

export interface UserStats {
  total: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  active: number;
}

// 获取看板数据
export const getDashboardData = async () => {
  const response = await api.get<{ data: DashboardData }>('/admin-api/stats/dashboard');
  return response.data.data;
};

// 获取收入统计
export const getRevenueStats = async (startDate?: string, endDate?: string) => {
  const response = await api.get<{ data: RevenueStats }>('/admin-api/stats/revenue', {
    params: { startDate, endDate }
  });
  return response.data.data;
};

// 获取用户统计
export const getUserStats = async (startDate?: string, endDate?: string) => {
  const response = await api.get<{ data: UserStats }>('/admin-api/stats/users', {
    params: { startDate, endDate }
  });
  return response.data.data;
};

// 获取热门模板
export const getPopularTemplates = async (limit: number = 10) => {
  const response = await api.get<{ data: PopularTemplate[] }>('/admin-api/stats/templates', {
    params: { limit }
  });
  return response.data.data;
};

// 获取趋势数据
export const getTrendData = async (days: number = 7) => {
  const response = await api.get<{ data: TrendData }>('/admin-api/stats/trends', {
    params: { days }
  });
  return response.data.data;
};
