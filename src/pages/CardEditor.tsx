import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Background from '../components/Background';

// 预设祝福语
const PRESET_GREETINGS = [
  '新春快乐，阖家欢乐！',
  '恭贺新禧，万事如意！',
  '福星高照，好运连连！',
  '龙年大吉，心想事成！',
  '团团圆圆，幸福美满！',
  '岁岁平安，年年有余！',
];

// 贺卡模板样式
const CARD_TEMPLATES = [
  { id: 'classic', name: '经典红', bgColor: 'from-red-600 to-red-800', textColor: 'text-yellow-300' },
  { id: 'gold', name: '金色福', bgColor: 'from-yellow-600 to-orange-600', textColor: 'text-red-700' },
  { id: 'elegant', name: '雅致紫', bgColor: 'from-purple-600 to-pink-600', textColor: 'text-white' },
  { id: 'modern', name: '现代蓝', bgColor: 'from-blue-600 to-indigo-600', textColor: 'text-yellow-200' },
];

export default function CardEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedImage } = location.state || {};
  
  const [customGreeting, setCustomGreeting] = useState('新春快乐，阖家欢乐！');
  const [selectedTemplate, setSelectedTemplate] = useState(CARD_TEMPLATES[0]);
  const [isSaving, setIsSaving] = useState(false);
  
  if (!selectedImage) {
    navigate('/generator');
    return null;
  }
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSelectPreset = (greeting: string) => {
    setCustomGreeting(greeting);
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // TODO: 实现贺卡保存逻辑
      // 1. 将贺卡渲染为图片
      // 2. 保存到本地或上传到服务器
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('贺卡已保存');
      navigate(-1);
    } catch (error) {
      console.error('保存贺卡失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleShare = async () => {
    try {
      // TODO: 实现贺卡分享逻辑
      if (navigator.share) {
        await navigator.share({
          title: '新春贺卡',
          text: customGreeting,
          url: window.location.href
        });
        toast.success('分享成功');
      } else {
        await navigator.clipboard.writeText(customGreeting);
        toast.success('祝福语已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      if ((error as Error).name !== 'AbortError') {
        toast.error('分享失败，请重试');
      }
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-[#FFF8F0]">
      <Background />
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-sm bg-white/70 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="flex items-center text-[#D4302B] font-medium"
          >
            <i className="fas fa-arrow-left mr-1"></i>
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-[#D4302B]">生成拜年贺卡</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 z-10 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          {/* 贺卡预览区 */}
          <motion.div 
            className="bg-white rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">贺卡预览</h2>
            
            {/* 贺卡内容 */}
            <div className={`relative w-full aspect-[3/4] bg-gradient-to-br ${selectedTemplate.bgColor} rounded-lg overflow-hidden shadow-xl`}>
              {/* 装饰元素 */}
              <div className="absolute top-4 left-4 text-4xl opacity-20">🏮</div>
              <div className="absolute top-4 right-4 text-4xl opacity-20">🏮</div>
              <div className="absolute bottom-4 left-4 text-4xl opacity-20">🧧</div>
              <div className="absolute bottom-4 right-4 text-4xl opacity-20">🧧</div>
              
              {/* 照片 */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48">
                <img 
                  src={selectedImage} 
                  alt="Family Photo" 
                  className="w-full h-full object-cover rounded-lg border-4 border-white shadow-lg"
                />
              </div>
              
              {/* 祝福语 */}
              <div className="absolute bottom-16 left-0 right-0 px-6">
                <p className={`text-center text-xl font-bold ${selectedTemplate.textColor} leading-relaxed`}>
                  {customGreeting}
                </p>
              </div>
              
              {/* 署名 */}
              <div className="absolute bottom-6 right-6">
                <p className={`text-sm ${selectedTemplate.textColor} opacity-80`}>
                  AI全家福·团圆照相馆
                </p>
              </div>
            </div>
          </motion.div>

          {/* 模板选择 */}
          <motion.div 
            className="bg-white rounded-xl p-4 shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-base font-semibold text-gray-800 mb-3">选择模板</h3>
            <div className="grid grid-cols-4 gap-2">
              {CARD_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTemplate.id === template.id
                      ? 'border-[#D4302B] ring-2 ring-[#D4302B]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-12 bg-gradient-to-br ${template.bgColor} rounded`}></div>
                  <p className="text-xs text-gray-600 mt-1 text-center">{template.name}</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* 祝福语编辑 */}
          <motion.div 
            className="bg-white rounded-xl p-4 shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-base font-semibold text-gray-800 mb-3">自定义祝福语</h3>
            
            {/* 预设祝福语 */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">快速选择：</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_GREETINGS.map((greeting, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectPreset(greeting)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      customGreeting === greeting
                        ? 'bg-[#D4302B] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {greeting}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 自定义输入 */}
            <div>
              <p className="text-sm text-gray-600 mb-2">或输入自定义祝福语：</p>
              <textarea
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                placeholder="输入您的祝福语..."
                maxLength={50}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#D4302B] resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {customGreeting.length}/50
              </p>
            </div>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full h-12 rounded-xl font-medium flex items-center justify-center shadow-lg ${
                isSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#D4302B] to-[#E74C3C] text-white hover:shadow-xl'
              }`}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  保存中...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  保存贺卡
                </>
              )}
            </button>
            
            <button
              onClick={handleShare}
              className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#F4CF47] text-white rounded-xl font-medium flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              <i className="fas fa-share-alt mr-2"></i>
              分享贺卡
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
