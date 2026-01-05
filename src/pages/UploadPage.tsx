import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ElderModeToggle from '../components/ElderModeToggle';
import { faceAPI } from '../lib/api';
import { uploadImageToOSS } from '../lib/utils';
import { useElderMode } from '@/contexts/ElderModeContext';
import { useModeConfig } from '@/hooks/useModeConfig';
import PageTransition from '@/components/PageTransition';
import transformUploadBg from '@/assets/transform-upload-bg.png';

// 上传模式类型
type UploadMode = 'puzzle' | 'transform';

// 人脸信息
interface FaceInfo {
  image_base64: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  source_image: string;
}

// 上传的图片信息
interface UploadedImage {
  id: string;
  dataUrl: string;
  file: File;
  faceDetected?: boolean;
  faceCheckStatus?: 'pending' | 'success' | 'failed';
  faceCheckMessage?: string;
  faces?: FaceInfo[]; // 提取到的人脸信息
}

export default function UploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const modeConfig = useModeConfig();
  
  // 兼容旧的 state 传递方式
  const mode = (modeConfig?.id || location.state?.mode || 'puzzle') as UploadMode;
  const { isElderMode, voiceEnabled, speak } = useElderMode();
  
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCheckingFaces, setIsCheckingFaces] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);
  
  // 语音引导文案 - 优先使用配置，否则使用默认值
  const voiceGuidanceText = modeConfig?.content.voiceGuide || (
    mode === 'puzzle' 
      ? '请上传清晰正面照，光线越亮效果越好'
      : '请上传您的全家福照片，我们将为您更换背景'
  );
  
  // 页面加载时播放语音引导
  useEffect(() => {
    if (voiceEnabled) {
      // 延迟播放，避免页面加载时立即播放
      const timer = setTimeout(() => {
        speak(voiceGuidanceText);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [voiceEnabled, voiceGuidanceText, speak]);
  
  // 检查是否可以进入下一步 - 使用配置或默认值
  const minImages = modeConfig?.features.minImages || (mode === 'puzzle' ? 2 : 1);
  const canProceed = uploadedImages.length >= minImages && 
    uploadedImages.every(img => img.faceCheckStatus === 'success');
  
  const handleBack = () => {
    // 返回到对应模式的落地页
    if (modeConfig) {
      navigate(modeConfig.slug);
    } else {
      navigate('/function-selector');
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(Array.from(files));
    }
  };
  
  const processFiles = async (files: File[]) => {
    // 使用配置或默认值
    const maxFiles = modeConfig?.features.maxImages || (mode === 'puzzle' ? 5 : 1);
    const remainingSlots = maxFiles - uploadedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      toast(`最多只能上传${maxFiles}张照片`);
    }
    
    // 检查文件格式和大小
    const validFiles: File[] = [];
    for (const file of filesToProcess) {
      // 检查格式
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        toast.error(`${file.name} 格式不支持，请上传JPG或PNG格式`);
        continue;
      }
      
      // 检查大小（最大10MB）
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 文件过大，请上传小于10MB的图片`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    // 读取文件并添加到列表
    const newImages: UploadedImage[] = [];
    for (const file of validFiles) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push({
              id: `${Date.now()}-${Math.random()}`,
              dataUrl: event.target.result as string,
              file,
              faceCheckStatus: 'pending'
            });
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    
    setUploadedImages(prev => [...prev, ...newImages]);
    
    // 自动进行人脸检测
    await checkFacesForImages(newImages);
  };
  
  // 检测图片中的人脸
  const checkFacesForImages = async (images: UploadedImage[]) => {
    setIsCheckingFaces(true);
    
    try {
      for (const image of images) {
        // 上传图片到OSS
        const imageUrl = await uploadImageToOSS(image.dataUrl);
        
        // 调用人脸提取API进行检测
        const result = await faceAPI.extractFaces([imageUrl]);
        
        // 检查是否成功提取到人脸
        const faceDetected = result.success && result.faces && result.faces.length > 0;
        
        setUploadedImages(prev => prev.map(img => 
          img.id === image.id 
            ? {
                ...img,
                faceDetected: faceDetected,
                faceCheckStatus: faceDetected ? 'success' : 'failed',
                faceCheckMessage: faceDetected 
                  ? `检测到 ${result.faces.length} 张人脸` 
                  : (result.message || '未检测到人脸'),
                faces: faceDetected ? result.faces : undefined
              }
            : img
        ));
        
        if (!faceDetected) {
          toast.error(result.message || '未检测到人脸，请重新上传');
        } else {
          toast.success(`成功检测到 ${result.faces.length} 张人脸`);
        }
      }
    } catch (error) {
      console.error('人脸检测失败:', error);
      toast.error('人脸检测失败，请重试');
      
      // 标记所有待检测的图片为失败
      setUploadedImages(prev => prev.map(img => 
        images.find(i => i.id === img.id)
          ? { ...img, faceCheckStatus: 'failed' as const, faceCheckMessage: '检测失败' }
          : img
      ));
    } finally {
      setIsCheckingFaces(false);
    }
  };
  
  // 删除图片
  const removeImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };
  
  // 拖拽上传处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };
  
  // 进入下一步
  const handleNext = () => {
    if (!canProceed) return;
    
    // 传递上传的图片到模板选择页
    const targetPath = modeConfig ? `${modeConfig.slug}/template` : '/template';
    navigate(targetPath, {
      state: {
        mode,
        uploadedImages: uploadedImages.map(img => img.dataUrl)
      }
    });
  };
  
  // 语音指令支持（简化版，实际需要语音识别API）
  const handleVoiceCommand = () => {
    toast('语音指令功能开发中...');
    // 实际实现需要集成语音识别API
    // 这里可以使用 Web Speech API 或第三方服务
  };
  
  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#C8102E] via-[#D4302B] to-[#B8001F]">
      {/* 背景图片 - 富贵变身模式使用专属背景 */}
      {mode === 'transform' && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: `url(${transformUploadBg})`,
          }}
        />
      )}
      
      {/* 装饰背景元素 - 简化版 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 简单装饰 */}
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
            {modeConfig?.name || (mode === 'puzzle' ? '时空拼图' : '富贵变身')}
          </h1>
          <ElderModeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 z-10">
        {/* 语音引导文案 - 卷轴样式 */}
        {voiceEnabled && (
          <motion.div
            className="mb-6 relative"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* 卷轴背景 */}
            <div className="relative bg-gradient-to-r from-[#F4E4C1] via-[#FFF8DC] to-[#F4E4C1] rounded-lg p-4 border-2 border-[#D4AF37] shadow-lg">
              {/* 装饰花纹 */}
              <div className="absolute top-2 left-2 text-[#D4AF37] text-xs">🎋</div>
              <div className="absolute top-2 right-2 text-[#D4AF37] text-xs">🎋</div>
              
              <p className="text-[#8B4513] text-base font-medium text-center flex items-center justify-center">
                <i className="fas fa-volume-up mr-2 text-[#D4302B]"></i>
                {voiceGuidanceText}
              </p>
            </div>
          </motion.div>
        )}

        {/* 上传区域 */}
        {(modeConfig?.features.allowDragUpload || mode === 'transform') ? (
          // 富贵变身上传模式（支持拖拽）
          <TransformModeUpload
            uploadedImages={uploadedImages}
            isCheckingFaces={isCheckingFaces}
            isDragging={isDragging}
            onUploadClick={handleUploadClick}
            onRemoveImage={removeImage}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragAreaRef={dragAreaRef}
          />
        ) : (
          // 时空拼图上传模式（圆形网格）
          <PuzzleModeUpload
            uploadedImages={uploadedImages}
            isCheckingFaces={isCheckingFaces}
            onUploadClick={handleUploadClick}
            onRemoveImage={removeImage}
            onVoiceCommand={handleVoiceCommand}
          />
        )}

        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/jpg,image/png"
          multiple={mode === 'puzzle'}
          className="hidden"
        />

        {/* 示例图参考 - 老年模式下隐藏 */}
        {!isElderMode && (
          <motion.div
            className="mt-6 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative p-1 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
              <div className="bg-gradient-to-br from-[#FFF8DC] to-[#F4E4C1] rounded-lg p-4">
                <h3 className="text-[#8B4513] font-medium mb-2 flex items-center">
                  <i className="fas fa-lightbulb mr-2 text-[#D4AF37]"></i>
                  拍照建议
                </h3>
                <ul className="text-[#8B4513] text-sm space-y-1">
                  <li>• 选择光线充足的环境</li>
                  <li>• 保持正面拍摄，避免侧脸</li>
                  <li>• 确保人脸清晰，不要模糊</li>
                  <li>• 避免戴墨镜或遮挡面部</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* 下一步按钮 - 金色渐变 */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleNext}
            disabled={!canProceed || isCheckingFaces}
            className={`relative w-full h-14 rounded-full overflow-hidden ${
              !canProceed || isCheckingFaces ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {canProceed && !isCheckingFaces ? (
              <>
                {/* 金色边框 */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] p-0.5 rounded-full">
                  <div className="w-full h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full flex items-center justify-center hover:from-[#F4C430] hover:to-[#D4AF37] transition-all duration-300">
                    <span className="text-[#8B0000] text-lg font-bold flex items-center">
                      下一步
                      <i className="fas fa-arrow-right ml-2"></i>
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
                  {isCheckingFaces ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      检测人脸中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock mr-2"></i>
                      请上传至少{minImages}张照片
                    </>
                  )}
                </span>
              </div>
            )}
          </button>
          
          {uploadedImages.length > 0 && (
            <p className="text-white/80 text-sm mt-2 text-center">
              已上传 {uploadedImages.filter(img => img.faceCheckStatus === 'success').length}/{uploadedImages.length} 张照片通过检测
            </p>
          )}
        </motion.div>
      </main>
    </div>
    </PageTransition>
  );
}

// 时空拼图上传模式组件
function PuzzleModeUpload({
  uploadedImages,
  isCheckingFaces,
  onUploadClick,
  onRemoveImage,
  onVoiceCommand
}: {
  uploadedImages: UploadedImage[];
  isCheckingFaces: boolean;
  onUploadClick: () => void;
  onRemoveImage: (id: string) => void;
  onVoiceCommand: () => void;
}) {
  const modeConfig = useModeConfig();
  const maxImages = modeConfig?.features.maxImages || 5;
  const emptySlots = Math.max(0, maxImages - uploadedImages.length);
  
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 金色中式边框 */}
      <div className="relative p-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
        <div className="bg-gradient-to-br from-[#8B0000] to-[#B8001F] rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#FFD700]">时空拼图</h2>
            <button
              onClick={onVoiceCommand}
              className="text-[#FFD700] text-sm flex items-center hover:text-[#FFC700] transition-colors"
            >
              <i className="fas fa-microphone mr-1"></i>
              语音添加
            </button>
          </div>
          
          {/* 圆形上传框网格 - 金色边框 */}
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            {/* 已上传的图片 */}
            {uploadedImages.map((image) => (
              <motion.div
                key={image.id}
                className="relative"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {/* 金色圆形边框 */}
                <div className="relative p-0.5 rounded-full bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#D4AF37]">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white relative group">
                    {/* 显示提取的人脸照片，如果有的话 */}
                    {image.faces && image.faces.length > 0 ? (
                      <>
                        <img
                          src={`data:image/png;base64,${image.faces[0].image_base64}`}
                          alt="Face"
                          className="w-full h-full object-cover"
                        />
                        {/* 如果检测到多张人脸，显示数量标记 */}
                        {image.faces.length > 1 && (
                          <div className="absolute top-0 left-0 bg-gradient-to-r from-[#D4302B] to-[#E84A3D] text-white text-[10px] px-1.5 py-0.5 rounded-br-lg font-bold">
                            +{image.faces.length - 1}
                          </div>
                        )}
                      </>
                    ) : (
                      <img
                        src={image.dataUrl}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* 检测状态覆盖层 */}
                    {image.faceCheckStatus === 'pending' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <i className="fas fa-spinner fa-spin text-white"></i>
                      </div>
                    )}
                    
                    {image.faceCheckStatus === 'success' && (
                      <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg">
                        ✓
                      </div>
                    )}
                    
                    {image.faceCheckStatus === 'failed' && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-white"></i>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 删除按钮 */}
                <button
                  onClick={() => onRemoveImage(image.id)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 shadow-lg z-10"
                >
                  ×
                </button>
                
                {/* 检测结果提示 */}
                {image.faceCheckStatus === 'success' && (
                  <p className="text-green-400 text-xs mt-1 text-center font-medium">
                    {image.faces && image.faces.length > 1 ? (
                      <>
                        <i className="fas fa-users mr-1"></i>
                        {image.faces.length}人
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-1"></i>
                        成功
                      </>
                    )}
                  </p>
                )}
                {image.faceCheckStatus === 'failed' && (
                  <p className="text-red-400 text-xs mt-1 text-center">
                    ⚠️ {image.faceCheckMessage || '检测失败'}
                  </p>
                )}
              </motion.div>
            ))}
            
            {/* 空白上传框 - 金色虚线边框 */}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <motion.button
                key={`empty-${index}`}
                onClick={onUploadClick}
                disabled={isCheckingFaces}
                className="relative p-0.5 rounded-full bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#8B0000] bg-[#FFF8DC]/20 flex flex-col items-center justify-center hover:bg-[#FFF8DC]/40 transition-colors">
                  <i className="fas fa-plus text-[#FFD700] text-xl mb-1"></i>
                  <span className="text-[#FFD700] text-xs">添加家人</span>
                </div>
              </motion.button>
            ))}
          </div>
          
          {/* 底部统计信息 */}
          <div className="mt-4 space-y-2">
            <p className="text-white/80 text-sm text-center">
              最多上传5张照片，至少需要2张
            </p>
            
            {/* 显示总人脸数 */}
            {uploadedImages.some(img => img.faces && img.faces.length > 0) && (
              <motion.div
                className="bg-gradient-to-r from-[#FFD700]/20 to-[#FFC700]/20 rounded-lg p-2 border border-[#FFD700]/30"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center justify-center text-sm">
                  <i className="fas fa-users text-[#FFD700] mr-2"></i>
                  <span className="text-white">
                    已识别 
                    <span className="font-bold text-[#FFD700] mx-1">
                      {uploadedImages.reduce((sum, img) => 
                        sum + (img.faces?.length || 0), 0
                      )}
                    </span>
                    张人脸
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 富贵变身上传模式组件
function TransformModeUpload({
  uploadedImages,
  isCheckingFaces,
  isDragging,
  onUploadClick,
  onRemoveImage,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  dragAreaRef
}: {
  uploadedImages: UploadedImage[];
  isCheckingFaces: boolean;
  isDragging: boolean;
  onUploadClick: () => void;
  onRemoveImage: (id: string) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragAreaRef: React.RefObject<HTMLDivElement>;
}) {
  const uploadedImage = uploadedImages[0];
  
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 金色龙纹边框 */}
      <div className="relative p-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]">
        <div className="bg-gradient-to-br from-[#8B0000] to-[#B8001F] rounded-xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-[#FFD700] mb-4 flex items-center">
            <span className="mr-2">📸</span>
            富贵变身
          </h2>
          
          {uploadedImage ? (
            // 已上传图片预览
            <div className="space-y-4">
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {/* 金色相框边框 */}
                <div className="relative p-1 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#D4AF37]">
                  <div className="w-full aspect-[7/5] rounded-lg overflow-hidden bg-white relative">
                    <img
                      src={uploadedImage.dataUrl}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* 检测状态覆盖层 */}
                    {uploadedImage.faceCheckStatus === 'pending' && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <i className="fas fa-spinner fa-spin text-white text-3xl mb-2"></i>
                        <p className="text-white">检测人脸中...</p>
                      </div>
                    )}
                    
                    {uploadedImage.faceCheckStatus === 'success' && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center shadow-lg">
                        <i className="fas fa-check mr-1"></i>
                        {uploadedImage.faceCheckMessage}
                      </div>
                    )}
                    
                    {uploadedImage.faceCheckStatus === 'failed' && (
                      <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-white text-3xl mb-2"></i>
                        <p className="text-white">{uploadedImage.faceCheckMessage || '检测失败'}</p>
                        <button
                          onClick={onUploadClick}
                          className="mt-4 px-4 py-2 bg-white text-red-500 rounded-lg hover:bg-gray-100"
                        >
                          重新上传
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 删除按钮 */}
                <button
                  onClick={() => onRemoveImage(uploadedImage.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg z-10"
                >
                  <i className="fas fa-times"></i>
                </button>
              </motion.div>
              
              {/* 提取的人脸展示区域 */}
              {uploadedImage.faces && uploadedImage.faces.length > 0 && (
                <motion.div
                  className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFC700]/20 rounded-lg p-4 border border-[#FFD700]/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <i className="fas fa-user-check text-green-400 mr-2"></i>
                      <h3 className="text-sm font-semibold text-white">
                        检测到的人脸 ({uploadedImage.faces.length})
                      </h3>
                    </div>
                    {uploadedImage.faces.length > 1 && (
                      <span className="text-xs text-[#FFD700] bg-[#8B0000] px-2 py-1 rounded-full border border-[#FFD700]/30">
                        <i className="fas fa-users mr-1"></i>
                        全家福
                      </span>
                    )}
                  </div>
                  
                  {/* 根据人脸数量调整布局 */}
                  <div className={`grid gap-3 ${
                    uploadedImage.faces.length === 1 
                      ? 'grid-cols-1 max-w-[200px] mx-auto' 
                      : uploadedImage.faces.length === 2 
                      ? 'grid-cols-2' 
                      : uploadedImage.faces.length <= 4
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                  }`}>
                    {uploadedImage.faces.map((face, index) => (
                      <motion.div
                        key={index}
                        className="relative group"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        {/* 金色边框 */}
                        <div className="relative p-0.5 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#D4AF37]">
                          <div className="aspect-square rounded-lg overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow">
                            <img
                              src={`data:image/png;base64,${face.image_base64}`}
                              alt={`Face ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        
                        {/* 人脸序号标签 */}
                        <div className="absolute top-1 left-1 bg-gradient-to-r from-[#D4302B] to-[#E84A3D] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          #{index + 1}
                        </div>
                        
                        {/* 置信度标签 */}
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center">
                          <i className="fas fa-check-circle mr-1 text-green-400"></i>
                          {Math.round(face.confidence * 100)}%
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* 底部提示信息 */}
                  <div className="mt-3 pt-3 border-t border-[#FFD700]/30">
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-white/80 flex items-center">
                        <i className="fas fa-info-circle mr-1"></i>
                        已自动提取照片中的人脸区域
                      </p>
                      {uploadedImage.faces.length > 1 && (
                        <p className="text-green-400 font-medium">
                          <i className="fas fa-check mr-1"></i>
                          适合制作全家福
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            // 上传区域 - 金色相机图标
            <div
              ref={dragAreaRef}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onClick={onUploadClick}
              className={`w-full aspect-[7/5] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#FFD700] bg-[#FFD700]/10'
                  : 'border-[#FFD700]/50 hover:border-[#FFD700] hover:bg-[#FFD700]/5'
              } ${isCheckingFaces ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* 金色相机图标 */}
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4AF37] flex items-center justify-center shadow-lg">
                  <i className="fas fa-camera text-[#8B0000] text-3xl"></i>
                </div>
                {/* 装饰圆环 */}
                <div className="absolute inset-0 rounded-full border-2 border-[#FFD700]/30 animate-ping"></div>
              </div>
              
              <p className="text-[#FFD700] font-medium mb-2 text-lg">
                {isDragging ? '松开鼠标上传' : '点击或拖拽上传照片'}
              </p>
              <p className="text-white/60 text-sm">
                支持JPG/PNG，最大10MB
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
