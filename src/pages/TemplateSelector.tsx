import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Background from '../components/Background';
import ElderModeToggle from '../components/ElderModeToggle';
import { getTemplateImages } from '../lib/utils';
import { useElderMode } from '@/contexts/ElderModeContext';
import PageTransition from '@/components/PageTransition';

// 模板数据类型
interface Template {
  id: string;
  url: string;
  name: string;
}

export default function TemplateSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, uploadedImages } = location.state || {};
  const { isElderMode, voiceEnabled, speak } = useElderMode();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 缓存键
  const TEMPLATES_CACHE_KEY = 'cached_templates';
  const CACHE_EXPIRY_KEY = 'templates_cache_expiry';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
  
  // 加载模板列表（带缓存）
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        
        // 尝试从缓存加载
        const cachedTemplates = localStorage.getItem(TEMPLATES_CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        const now = Date.now();
        
        if (cachedTemplates && cacheExpiry && now < parseInt(cacheExpiry)) {
          // 使用缓存数据
          const templateList: Template[] = JSON.parse(cachedTemplates);
          setTemplates(templateList);
          
          // 默认选中第一个模板
          if (templateList.length > 0) {
            setSelectedTemplate(templateList[0]);
          }
          
          setIsLoading(false);
          return;
        }
        
        // 从后端获取模板列表
        const templateUrls = await getTemplateImages();
        
        // 将URL转换为Template对象
        const templateList: Template[] = templateUrls.map((url, index) => ({
          id: `template-${index + 1}`,
          url,
          name: index === 0 ? '新中式团圆' : `模板 ${index + 1}`
        }));
        
        setTemplates(templateList);
        
        // 缓存模板数据
        try {
          localStorage.setItem(TEMPLATES_CACHE_KEY, JSON.stringify(templateList));
          localStorage.setItem(CACHE_EXPIRY_KEY, (now + CACHE_DURATION).toString());
        } catch (error) {
          console.error('缓存模板数据失败:', error);
        }
        
        // 默认选中第一个模板（新中式团圆）
        if (templateList.length > 0) {
          setSelectedTemplate(templateList[0]);
        }
      } catch (error) {
        console.error('加载模板失败:', error);
        toast.error('加载模板失败，请重试');
        
        // 尝试使用过期的缓存作为降级方案
        const cachedTemplates = localStorage.getItem(TEMPLATES_CACHE_KEY);
        if (cachedTemplates) {
          try {
            const templateList: Template[] = JSON.parse(cachedTemplates);
            setTemplates(templateList);
            if (templateList.length > 0) {
              setSelectedTemplate(templateList[0]);
            }
            toast('已加载缓存的模板数据');
          } catch (e) {
            console.error('解析缓存失败:', e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTemplates();
  }, []);
  
  // 从localStorage恢复选中的模板
  useEffect(() => {
    const savedTemplateUrl = localStorage.getItem('selectedTemplate');
    if (savedTemplateUrl && templates.length > 0) {
      const savedTemplate = templates.find(t => t.url === savedTemplateUrl);
      if (savedTemplate) {
        setSelectedTemplate(savedTemplate);
      }
    }
  }, [templates]);
  
  // 页面加载时播放语音引导
  useEffect(() => {
    if (voiceEnabled && templates.length > 0) {
      speak('请选择一个艺术风格模板');
    }
  }, [voiceEnabled, templates.length, speak]);
  
  const handleBack = () => {
    navigate('/upload', { state: { mode } });
  };
  
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    
    // 保存到localStorage
    try {
      localStorage.setItem('selectedTemplate', template.url);
    } catch (error) {
      console.error('保存模板选择失败:', error);
    }
    
    // 触发震动反馈
    if ('vibrate' in navigator) {
      (navigator as any).vibrate(50);
    }
    
    toast.success(`已选择：${template.name}`);
  };
  
  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };
  
  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }
    
    if (!uploadedImages || uploadedImages.length === 0) {
      toast.error('缺少上传的图片');
      return;
    }
    
    try {
      // 显示加载提示
      toast.loading('正在启动生成...');
      
      // 获取用户ID
      const userId = localStorage.getItem('userId') || '';
      
      // 调用生成API
      const { buildApiUrl, API_ENDPOINTS } = await import('../lib/apiConfig');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.GENERATE_ART_PHOTO), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '生成中国风全家福艺术照',
          imageUrls: uploadedImages,
          userId: userId,
          templateUrl: selectedTemplate.url,
          facePositions: null // 暂时为null，后续可以从上传页面传递
        }),
      });
      
      if (!response.ok) {
        throw new Error('生成请求失败');
      }
      
      const result = await response.json();
      const taskId = result.data?.taskId;
      
      if (!taskId) {
        throw new Error('未获取到任务ID');
      }
      
      toast.dismiss();
      
      // 跳转到生成等待页，传递taskId
      navigate('/generating', {
        state: {
          taskId,
          userId,
          mode,
          uploadedImages,
          selectedTemplate: selectedTemplate.url
        }
      });
    } catch (error) {
      console.error('启动生成失败:', error);
      toast.dismiss();
      toast.error('启动生成失败，请重试');
    }
  };
  
  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
      <Background />
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-sm bg-white/70 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="flex items-center text-[#6B5CA5] font-medium"
          >
            <i className="fas fa-arrow-left mr-1"></i>
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-[#6B5CA5]">选择模板</h1>
          <ElderModeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 z-10 flex flex-col">
        {/* 引导文案 */}
        {voiceEnabled && (
          <motion.div
            className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-700 text-base font-medium text-center">
              <i className="fas fa-palette mr-2"></i>
              选择一个艺术风格模板，让AI为您生成专属全家福
            </p>
          </motion.div>
        )}

        {/* 当前选中模板预览 */}
        {selectedTemplate && (
          <motion.div
            className="mb-6 bg-white/80 rounded-xl p-4 shadow-md"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              当前选中：{selectedTemplate.name}
            </h2>
            <div className="relative">
              <img
                src={selectedTemplate.url}
                alt={selectedTemplate.name}
                className="w-full h-48 object-cover rounded-lg border-2 border-[#D4AF37]"
              />
              <div className="absolute top-2 right-2 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <i className="fas fa-check mr-1"></i>
                已选中
              </div>
            </div>
          </motion.div>
        )}

        {/* 模板横向滚动列表 */}
        <motion.div
          className="flex-1 bg-white/80 rounded-xl p-4 shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            选择模板风格
          </h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-[#6B5CA5] text-3xl mb-2"></i>
                <p className="text-gray-500">加载模板中...</p>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  className="flex-shrink-0 snap-center"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ${
                      selectedTemplate?.id === template.id
                        ? 'ring-4 ring-[#D4AF37] shadow-lg scale-105'
                        : 'ring-2 ring-gray-200 hover:ring-[#6B5CA5] hover:shadow-md'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                    style={{ width: '200px', height: '280px' }}
                  >
                    <img
                      src={template.url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* 选中标记 */}
                    {selectedTemplate?.id === template.id && (
                      <motion.div
                        className="absolute top-2 right-2 bg-[#D4AF37] text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      >
                        <i className="fas fa-check text-sm"></i>
                      </motion.div>
                    )}
                    
                    {/* 模板名称 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white font-medium text-sm">{template.name}</p>
                    </div>
                    
                    {/* 预览按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template);
                      }}
                      className="absolute top-2 left-2 bg-white/90 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <i className="fas fa-search-plus text-sm"></i>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* 滚动提示 */}
          {templates.length > 2 && (
            <div className="mt-3 text-center">
              <p className="text-gray-400 text-xs flex items-center justify-center">
                <i className="fas fa-hand-point-right mr-2"></i>
                左右滑动查看更多模板
              </p>
            </div>
          )}
        </motion.div>

        {/* 生成按钮 */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate}
            className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
              selectedTemplate
                ? 'bg-gradient-to-r from-[#D4302B] to-[#E85D4A] text-white hover:from-[#C02820] hover:to-[#D74D3A] shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{ minHeight: '48px' }}
          >
            {selectedTemplate ? (
              <>
                <i className="fas fa-magic mr-2"></i>
                开始生成
              </>
            ) : (
              <>
                <i className="fas fa-lock mr-2"></i>
                请先选择模板
              </>
            )}
          </button>
          
          {selectedTemplate && (
            <p className={`text-gray-500 text-sm mt-2 text-center ${isElderMode ? 'elder-mode-hide' : ''}`}>
              点击生成后，AI将为您创作专属全家福
            </p>
          )}
        </motion.div>
      </main>

      {/* 模板预览弹窗 */}
      <AnimatePresence>
        {showPreview && previewTemplate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              className="relative max-w-2xl w-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewTemplate.url}
                alt={previewTemplate.name}
                className="w-full h-auto rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setShowPreview(false)}
                className="absolute -top-4 -right-4 bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100 shadow-lg"
              >
                <i className="fas fa-times"></i>
              </button>
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
                <p className="text-gray-800 font-medium">{previewTemplate.name}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自定义滚动条样式 */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
    </PageTransition>
  );
}
