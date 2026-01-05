import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Background from '../components/Background';
import ElderModeToggle from '../components/ElderModeToggle';
import { useElderMode } from '@/contexts/ElderModeContext';
import { useModeConfig } from '@/hooks/useModeConfig';
import PageTransition from '@/components/PageTransition';
import { 
  getModeTemplates, 
  getModeTemplateCategories, 
  getDefaultTemplate,
  type TemplateConfig 
} from '@/config/modes/index';

export default function TemplateSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const modeConfig = useModeConfig();
  const { mode, uploadedImages } = location.state || {};
  const { isElderMode, voiceEnabled, speak } = useElderMode();
  
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateConfig | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
    
    toast.success(`已选择：${template.name}`);
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
      // 优化后的参数：
      // - imageUrls: 只包含用户照片（不包含模板图片）
      // - templateId: 模板ID（后端根据ID获取模板图片和prompt）
      // - mode: 模式ID
      // - 不再传递 prompt 和 templateUrl，防止信息泄露
      const { buildApiUrl, API_ENDPOINTS } = await import('../lib/apiConfig');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.GENERATE_ART_PHOTO), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: uploadedImages, // 只传用户照片
          templateId: selectedTemplate.id, // 只传模板ID
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
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#C8102E] via-[#D4302B] to-[#B8001F]">
      {/* 装饰背景元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 祥云装饰 */}
        <motion.div
          className="absolute top-20 left-10 text-4xl opacity-10"
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute bottom-40 right-10 text-4xl opacity-10"
          animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          ☁️
        </motion.div>
        
        {/* 金币装饰 */}
        <motion.div
          className="absolute top-32 right-16 text-2xl opacity-30"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          🪙
        </motion.div>
      </div>
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-sm bg-[#8B0000]/80 shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="flex items-center text-[#FFD700] font-medium hover:text-[#FFC700] transition-colors"
          >
            <i className="fas fa-arrow-left mr-1"></i>
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold text-[#FFD700]">
            {modeConfig?.name || '模板选择'}
          </h1>
          <ElderModeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 z-10 flex flex-col">
        {/* 引导文案 - 卷轴样式 */}
        {voiceEnabled && (
          <motion.div
            className="mb-6 relative"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative bg-gradient-to-r from-[#F4E4C1] via-[#FFF8DC] to-[#F4E4C1] rounded-lg p-4 border-2 border-[#D4AF37] shadow-lg">
              <div className="absolute top-2 left-2 text-[#D4AF37] text-xs">🎋</div>
              <div className="absolute top-2 right-2 text-[#D4AF37] text-xs">🎋</div>
              <p className="text-[#8B4513] text-base font-medium text-center flex items-center justify-center">
                <i className="fas fa-palette mr-2 text-[#D4302B]"></i>
                选择一个艺术风格模板，让AI为您生成专属全家福
              </p>
            </div>
          </motion.div>
        )}

        {/* 分类筛选 */}
        {categories.length > 0 && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#8B0000] font-bold shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                全部
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#8B0000] font-bold shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 当前选中模板预览 */}
        {selectedTemplate && (
          <motion.div
            className="mb-6 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="relative p-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
              <div className="bg-gradient-to-br from-[#8B0000] to-[#B8001F] rounded-xl p-4 shadow-2xl">
                <h2 className="text-base font-semibold text-[#FFD700] mb-3 flex items-center">
                  <i className="fas fa-check-circle text-green-400 mr-2"></i>
                  当前选中：{selectedTemplate.name}
                </h2>
                <div className="relative">
                  {/* 金色相框边框 */}
                  <div className="relative p-1 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#D4AF37]">
                    <img
                      src={selectedTemplate.url}
                      alt={selectedTemplate.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#8B0000] px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                    <i className="fas fa-star mr-1"></i>
                    爆款
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 模板横向滚动列表 */}
        <motion.div
          className="flex-1 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative p-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] h-full">
            <div className="bg-gradient-to-br from-[#8B0000] to-[#B8001F] rounded-xl p-4 shadow-2xl h-full flex flex-col">
              <h2 className="text-base font-semibold text-[#FFD700] mb-3">
                选择模板风格
              </h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-[#FFD700] text-3xl mb-2"></i>
                    <p className="text-white/80">加载模板中...</p>
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
                  {filteredTemplates.map((template, index) => (
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
                            ? 'ring-4 ring-[#FFD700] shadow-2xl scale-105'
                            : 'ring-2 ring-[#FFD700]/30 hover:ring-[#FFD700] hover:shadow-lg'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                        style={{ width: '200px', height: '280px' }}
                      >
                        {/* 金色边框 */}
                        <div className="absolute inset-0 p-0.5 bg-gradient-to-br from-[#FFD700] to-[#D4AF37] rounded-lg">
                          <img
                            src={template.url}
                            alt={template.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        
                        {/* 选中标记 */}
                        {selectedTemplate?.id === template.id && (
                          <motion.div
                            className="absolute top-2 right-2 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#8B0000] rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          >
                            <i className="fas fa-check text-sm font-bold"></i>
                          </motion.div>
                        )}
                        
                        {/* 模板名称 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <p className="text-[#FFD700] font-medium text-sm">{template.name}</p>
                        </div>
                        
                        {/* 预览按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(template);
                          }}
                          className="absolute top-2 left-2 bg-white/90 text-[#8B0000] rounded-full w-8 h-8 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                        >
                          <i className="fas fa-search-plus text-sm"></i>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* 滚动提示 */}
              {filteredTemplates.length > 2 && (
                <div className="mt-3 text-center">
                  <p className="text-white/60 text-xs flex items-center justify-center">
                    <i className="fas fa-hand-point-right mr-2"></i>
                    左右滑动查看更多模板
                  </p>
                </div>
              )}
              
              {/* 无模板提示 */}
              {filteredTemplates.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-white/60">该分类暂无模板</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 生成按钮 - 金色渐变 */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate}
            className={`relative w-full h-14 rounded-full overflow-hidden ${
              !selectedTemplate ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {selectedTemplate ? (
              <>
                {/* 金色边框 */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                  <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full flex items-center justify-center hover:from-[#F4C430] hover:to-[#D4AF37] transition-all duration-300">
                    <span className="text-[#8B0000] text-lg font-bold flex items-center">
                      <i className="fas fa-magic mr-2"></i>
                      立即生成
                    </span>
                  </div>
                </div>
                {/* 光效动画 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold flex items-center">
                  <i className="fas fa-lock mr-2"></i>
                  请先选择模板
                </span>
              </div>
            )}
          </button>
          
          {selectedTemplate && (
            <p className={`text-white/80 text-sm mt-2 text-center ${isElderMode ? 'elder-mode-hide' : ''}`}>
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
