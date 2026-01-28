import { useState, useEffect } from 'react';

export interface PackagePrice {
  free: number;
  basic: number;
  premium: number;
}

export interface PriceData {
  packages: PackagePrice;
  products?: {
    crystal: number;
    scroll: number;
  };
}

// 降级方案 - 本地默认价格
const FALLBACK_PRICES: PriceData = {
  packages: {
    free: 0,
    basic: 0.01,
    premium: 29.9
  }
};

// 价格缓存
let priceCache: PriceData | null = null;
let priceCacheTime = 0;
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从API获取价格配置
 */
const fetchPricesFromAPI = async (): Promise<PriceData> => {
  try {
    // 检查缓存
    const now = Date.now();
    if (priceCache && (now - priceCacheTime) < PRICE_CACHE_DURATION) {
      console.log('[usePrices] 使用缓存的价格配置');
      return priceCache;
    }

    console.log('[usePrices] 从API获取价格配置');
    
    const response = await fetch('/api/prices/current', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // 更新缓存
      priceCache = result.data;
      priceCacheTime = now;
      
      console.log('[usePrices] 价格配置获取成功', result.data);
      return result.data;
    }

    throw new Error('API返回数据格式错误');
  } catch (error) {
    console.warn('[usePrices] 从API获取价格失败，使用降级方案', error);
    return FALLBACK_PRICES;
  }
};

/**
 * 价格Hook - 从API获取价格配置，失败时使用降级方案
 */
export const usePrices = () => {
  const [prices, setPrices] = useState<PriceData>(FALLBACK_PRICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPrices = async () => {
      try {
        setLoading(true);
        const priceData = await fetchPricesFromAPI();
        
        if (mounted) {
          setPrices(priceData);
          setError(null);
        }
      } catch (err) {
        console.error('[usePrices] 加载价格失败', err);
        if (mounted) {
          setError(err as Error);
          // 即使出错也使用降级方案
          setPrices(FALLBACK_PRICES);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPrices();

    return () => {
      mounted = false;
    };
  }, []);

  return { prices, loading, error };
};

/**
 * 手动刷新价格（清除缓存并重新获取）
 */
export const refreshPrices = async (): Promise<PriceData> => {
  priceCache = null;
  priceCacheTime = 0;
  return fetchPricesFromAPI();
};
