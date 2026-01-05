import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import PageTransition from '@/components/PageTransition';
import { useUser } from '@/contexts/UserContext';
import { API_ENDPOINTS, apiFetch } from '@/lib/apiConfig';
import launchBg2 from '@/assets/launch-bg2.png';

interface HistoryRecord {
  id: string;
  task_ids: string[];
  template_url: string;
  original_image_urls: string[];
  generated_image_urls: string[];
  selected_image_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export default function TransformHistoryPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      // 先尝试获取当前用户的记录，如果没有则获取所有记录
      let response = await apiFetch<{ success: boolean; data: HistoryRecord[] }>(
        user?.id ? API_ENDPOINTS.HISTORY_USER(user.id, 20) : API_ENDPOINTS.HISTORY_ALL(20)
      );
      
      // 如果用户记录为空，尝试获取所有记录
      if ((!response.data || response.data.length === 0) && user?.id) {
        response = await apiFetch<{ success: boolean; data: HistoryRecord[] }>(
          API_ENDPOINTS.HISTORY_ALL(20)
        );
      }
      
      setRecords(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordClick = (record: HistoryRecord) => {
    if (record.status === 'completed' && record.generated_image_urls?.length > 0) {
      navigate('/transform/result-selector', {
        state: {
          taskId: record.task_ids?.[0],
          generatedImages: record.generated_image_urls,
          uploadedImages: record.original_image_urls,
          fromHistory: true,
        }
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '等待中', color: 'text-gray-500' },
      processing: { text: '生成中', color: 'text-blue-500' },
      completed: { text: '已完成', color: 'text-green-500' },
      failed: { text: '失败', color: 'text-red-500' },
    };
    return statusMap[status] || { text: status, color: 'text-gray-500' };
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
        {/* 背景 */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${launchBg2})`, backgroundColor: '#FFF8DC' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8DC]/50 via-transparent to-[#D4AF37]/30" />

        {/* 头部 */}
        <div className="relative z-10 flex items-center px-4 py-4">
          <button
            onClick={() => navigate('/transform')}
            className="p-2 rounded-full bg-white/80 shadow-md"
          >
            <svg className="w-6 h-6 text-[#8B4513]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-[#8B4513] pr-10">我的记录</h1>
        </div>

        {/* 内容区域 */}
        <div className="relative z-10 flex-1 px-4 pb-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#D4AF37] border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchHistory}
                className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg"
              >
                重试
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-[#8B4513] text-lg">暂无生成记录</p>
              <button
                onClick={() => navigate('/transform/upload')}
                className="mt-4 px-6 py-2 bg-[#D4AF37] text-white rounded-lg font-medium"
              >
                去制作
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {records.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleRecordClick(record)}
                  className={`bg-white/90 rounded-xl overflow-hidden shadow-md ${
                    record.status === 'completed' ? 'cursor-pointer' : 'opacity-70'
                  }`}
                >
                  {/* 图片预览 */}
                  <div className="aspect-square bg-gray-100 relative">
                    {record.selected_image_url || record.generated_image_urls?.[0] ? (
                      <img
                        src={record.selected_image_url || record.generated_image_urls[0]}
                        alt="生成结果"
                        className="w-full h-full object-cover"
                      />
                    ) : record.original_image_urls?.[0] ? (
                      <img
                        src={record.original_image_urls[0]}
                        alt="原图"
                        className="w-full h-full object-cover opacity-50"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🖼️
                      </div>
                    )}
                    
                    {/* 状态标签 */}
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 ${getStatusText(record.status).color}`}>
                      {getStatusText(record.status).text}
                    </div>
                  </div>

                  {/* 信息 */}
                  <div className="p-2">
                    <p className="text-xs text-gray-500">{formatDate(record.created_at)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
