import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useElderMode } from '@/contexts/ElderModeContext';
import { useModeConfig } from '@/hooks/useModeConfig';
import ElderModeToggle from '@/components/ElderModeToggle';
import PageTransition from '@/components/PageTransition';
import Loading from '@/components/Loading';
import { 
  getModeTemplates, 
  getModeTemplateCategories, 
  getDefaultTemplate,
  type TemplateConfig 
} from '@/config/modes/index';

// 导入背景图片
import commonBg from '@/assets/common-bg.jpg';

// 喜庆风格的自定义 Toast 组件
interface FestiveToastProps {
  message: string;
  visible: boolean;
}

const FestiveToast: React.FC<FestiveToastProps> = ({ message, visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-20 left-1/2 z-[100] pointer-events-none"
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="relative px-6 py-3 rounded-full bg-gradient-to-r from-[#C8102E] via-[#E31837] to-[#C8102E] shadow-lg border-2 border-[#FFD700]">
            {/* 金色装饰边框光效 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FFD700]/20 via-transparent to-[#FFD700]/20" />
            
            {/* 内容 */}
            <div className="flex items-center gap-2">
              <span className="text-lg">🎊</span>
              <span className="text-white font-medium text-sm whitespace-nowrap">{message}</span>
              <span className="text-lg">🎊</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function TemplateSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const modeConfig = useModeConfig();
  const { mode, uploadedImages } = location.state || {};
  const { voiceEnabled, speak } = useElderMode();
  
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateConfig | null>(null);
  const [festiveToast, setFestiveToast] = useState({ visible: false, message: '' });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 显示喜庆风格的 toast
  const showFestiveToast = useCallback((message: string) => {
    setFestiveToast({ visible: true, message });
    setTimeout(() => {
      setFestiveToast({ visible: false, message: '' });
    }, 2000);
  }, []);
  
  // 获取当前模式的分类
  const categories = modeConfig ? getModeTemplateCategories(modeConfig.id) : [];
  
  // 根据分类筛选模板
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);
  
  // 加载模板列表（从模式配置）
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        
        if (!modeConfig) {
          toast.error('模式配置未找到');
          setIsLoading(false);
          return;
        }
        
        // 从模式配置获取模板列表
        const templateList = getModeTemplates(modeConfig.id);
        setTemplates(templateList);
        
        // 默认选中第一个模板或配置的默认模板
        const defaultTemplate = getDefaultTemplate(modeConfig.id);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate);
        }
      } catch (error) {
        console.error('加载模板失败:', error);
        toast.error('加载模板失败，请重试');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTemplates();
  }, [modeConfig]);
  
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
    const targetPath = modeConfig ? `${modeConfig.slug}/upload` : '/upload';
    navigate(targetPath, { state: { mode } });
  };
  
  const handleTemplateSelect = (template: TemplateConfig) => {
    setSelectedTemplate(template);
    
    // 保存到localStorage
    try {
      localStorage.setItem('selectedTemplate', template.id);
    } catch (error) {
      console.error('保存模板选择失败:', error);
    }
    
    // 触发震动反馈
    if ('vibrate' in navigator) {
      (navigator as any).vibrate(50);
    }
    
    showFestiveToast(`已选择：${template.name}`);
  };
  
  const handlePreview = (template: TemplateConfig) => {
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
    
    if (!modeConfig) {
      toast.error('模式配置未找到');
      return;
    }
    
    try {
      // 显示加载提示
      toast.loading('正在启动生成...');
      
      // 获取用户ID
      const userId = localStorage.getItem('userId') || '';
      
      console.log(`\n========== [${modeConfig.name}] 前端生成请求详情 ==========`);
      console.log('📋 模式ID:', modeConfig.id);
      console.log('🎭 模板ID:', selectedTemplate.id);
      console.log('🎭 模板名称:', selectedTemplate.name);
      console.log('🖼️  用户照片数量:', uploadedImages.length);
      console.log('👤 用户ID:', userId || '未登录');
      console.log('📝 注意: prompt由后端管理，前端不传递');
      console.log('================================================\n');
      
      // 调用生成API
      const { buildApiUrl, API_ENDPOINTS } = await import('../lib/apiConfig');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.GENERATE_ART_PHOTO), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: uploadedImages,
          templateId: selectedTemplate.id,
          mode: modeConfig.id,
          userId: userId,
          facePositions: null
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '生成请求失败');
      }
      
      const result = await response.json();
      const taskId = result.data?.taskId;
      
      console.log(`\n========== [${modeConfig.name}] API 响应结果 ==========`);
      console.log('✅ 响应状态:', response.status);
      console.log('📦 响应数据:', result);
      console.log('🆔 任务ID:', taskId);
      console.log('================================================\n');
      
      if (!taskId) {
        throw new Error('未获取到任务ID');
      }
      
      toast.dismiss();
      
      // 跳转到生成等待页，传递taskId
      const targetPath = modeConfig ? `${modeConfig.slug}/generating` : '/generating';
      navigate(targetPath, {
        state: {
          taskId,
          userId,
          mode: modeConfig.id,
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
        {/* 喜庆风格 Toast */}
        <FestiveToast message={festiveToast.message} visible={festiveToast.visible} />
        
        {/* 背景图片 */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${commonBg})`,
          }}
        />
        
        {/* 深色渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        {/* 模式名称副标题栏 */}
        <div className="relative z-40 w-full bg-[#6B0000] shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="max-w-md mx-auto px-4 py-1.5 text-center">
            <h2 className="text-sm font-medium text-[#FFD700]/90 flex items-center justify-center">
              <span className="mr-1.5 text-base">{modeConfig?.theme.icon}</span>
              {modeConfig?.name || '选择模板'}
            </h2>
          </div>
        </div>

        {/* 顶部导航栏 */}
        <header className="relative z-30 w-full backdrop-blur-md bg-[#8B0000]/80 shadow-lg px-4 py-3 border-b border-[#D4AF37]/30">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="w-10"></div>
            <h1 className="text-xl font-bold text-[#FFD700] drop-shadow-sm">选择模板</h1>
            <ElderModeToggle />
          </div>
        </header>

        <main className="flex-1 relative z-10 flex flex-col px-4 pb-28">
          {/* 分类标签栏 */}
          {categories.length > 0 && (
            <motion.div
              className="py-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all border ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-[#D4302B] to-[#8B0000] text-[#FFD700] border-[#FFD700]/50 shadow-lg'
                      : 'bg-black/30 backdrop-blur-sm text-white/90 border-white/20 hover:bg-black/40'
                  }`}
                >
                  全部
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-[#D4302B] to-[#8B0000] text-[#FFD700] border-[#FFD700]/50 shadow-lg'
                        : 'bg-black/30 backdrop-blur-sm text-white/90 border-white/20 hover:bg-black/40'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* 模板网格区域 */}
          <motion.div
            className="flex-1 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loading text="加载模板中..." size="large" />
                </div>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="grid grid-cols-2 gap-3 pb-4"
              >
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 ${
                        selectedTemplate?.id === template.id
                          ? 'ring-2 ring-[#FFD700] shadow-xl shadow-[#FFD700]/20 scale-[1.02]'
                          : 'ring-1 ring-white/20 hover:ring-[#FFD700]/50 hover:shadow-lg'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                      style={{ aspectRatio: '3/4' }}
                    >
                      {/* 模板图片 */}
                      <img
                        src={template.url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* 选中标记 */}
                      {selectedTemplate?.id === template.id && (
                        <motion.div
                          className="absolute top-2 right-2 w-7 h-7 bg-gradient-to-br from-[#D4302B] to-[#8B0000] rounded-full flex items-center justify-center shadow-lg border-2 border-[#FFD700]"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                          <svg className="w-3.5 h-3.5 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                      
                      {/* 模板名称 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-8">
                        <p className="text-white font-medium text-sm truncate">{template.name}</p>
                      </div>
                      
                      {/* 预览按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(template);
                        }}
                        className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* 无模板提示 */}
            {filteredTemplates.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎨</div>
                <p className="text-white/60">该分类暂无模板</p>
              </div>
            )}
          </motion.div>
        </main>

        {/* 底部操作区 */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-4 pb-safe bg-gradient-to-t from-[#8B0000] via-[#8B0000]/95 to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* 当前选中提示 */}
          {selectedTemplate && (
            <div className="mb-3 text-center">
              <p className="text-white/80 text-sm">
                已选择：<span className="text-[#FFD700] font-medium">{selectedTemplate.name}</span>
              </p>
            </div>
          )}
          
          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate}
            className={`relative w-full h-14 rounded-full overflow-hidden transition-all ${
              !selectedTemplate ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
            }`}
          >
            {selectedTemplate ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                  <div className="w-full h-full bg-gradient-to-r from-[#D4302B] to-[#8B0000] rounded-full flex items-center justify-center">
                    <span className="text-[#FFD700] text-lg font-bold flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      立即生成
                    </span>
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </>
            ) : (
              <div className="w-full h-full bg-gray-500/50 rounded-full flex items-center justify-center">
                <span className="text-white/70 text-lg font-medium">请先选择模板</span>
              </div>
            )}
          </button>
        </motion.div>

        {/* 模板预览弹窗 */}
        <AnimatePresence>
          {showPreview && previewTemplate && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
            >
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
              
              {/* 装饰灯笼 */}
              <div className="absolute top-6 left-6 text-2xl opacity-60">🏮</div>
              <div className="absolute top-6 right-6 text-2xl opacity-60">🏮</div>
              
              <motion.div
                className="relative max-w-lg w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 金色边框 */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-[#FFD700] via-[#D4AF37] to-[#FFD700] rounded-2xl opacity-80" />
                
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={previewTemplate.url}
                    alt={previewTemplate.name}
                    className="w-full h-auto"
                  />
                  
                  {/* 关闭按钮 */}
                  <button
                    onClick={() => setShowPreview(false)}
                    className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-[#D4302B] to-[#8B0000] text-[#FFD700] rounded-full flex items-center justify-center shadow-lg border-2 border-[#FFD700] hover:scale-105 transition-transform"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* 底部信息和按钮 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-12">
                    <p className="text-[#FFD700] font-bold text-lg mb-3">{previewTemplate.name}</p>
                    <motion.button
                      onClick={() => {
                        handleTemplateSelect(previewTemplate);
                        setShowPreview(false);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-[#D4302B] to-[#8B0000] text-[#FFD700] rounded-xl font-bold shadow-lg border border-[#FFD700]/30 active:scale-[0.98] transition-transform"
                      whileTap={{ scale: 0.98 }}
                    >
                      ✨ 选择此模板
                    </motion.button>
                  </div>
                </div>
              </motion.div>
              
              {/* 底部装饰线 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4302B] via-[#FFD700] to-[#D4302B]" />
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
          .pt-safe {
            padding-top: max(12px, env(safe-area-inset-top));
          }
          .pb-safe {
            padding-bottom: max(16px, env(safe-area-inset-bottom));
          }
        `}</style>
      </div>
    </PageTransition>
  );
}
