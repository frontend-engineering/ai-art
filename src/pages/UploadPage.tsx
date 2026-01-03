import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Background from '../components/Background';
import ElderModeToggle from '../components/ElderModeToggle';
import { faceAPI } from '../lib/api';
import { uploadImageToOSS } from '../lib/utils';
import { useElderMode } from '@/contexts/ElderModeContext';
import PageTransition from '@/components/PageTransition';

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
  const mode = (location.state?.mode || 'puzzle') as UploadMode;
  const { isElderMode, voiceEnabled, speak } = useElderMode();
  
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCheckingFaces, setIsCheckingFaces] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);
  
  // 语音引导文案
  const voiceGuidanceText = mode === 'puzzle' 
    ? '请上传清晰正面照，光线越亮效果越好'
    : '请上传您的全家福照片，我们将为您更换背景';
  
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
  
  // 检查是否可以进入下一步
  const canProceed = mode === 'puzzle' 
    ? uploadedImages.length >= 2 && uploadedImages.every(img => img.faceCheckStatus === 'success')
    : uploadedImages.length >= 1 && uploadedImages.every(img => img.faceCheckStatus === 'success');
  
  const handleBack = () => {
    navigate('/function-selector');
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
    // 时空拼图模式最多5张，富贵变身模式只能1张
    const maxFiles = mode === 'puzzle' ? 5 : 1;
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
    navigate('/template', {
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
          <h1 className="text-xl font-bold text-[#6B5CA5]">
            {mode === 'puzzle' ? '时空拼图 - 上传照片' : '富贵变身 - 上传照片'}
          </h1>
          <ElderModeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 z-10">
        {/* 语音引导文案 */}
        {voiceEnabled && (
          <motion.div
            className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-700 text-lg font-medium text-center">
              <i className="fas fa-microphone mr-2"></i>
              {voiceGuidanceText}
            </p>
          </motion.div>
        )}

        {/* 上传区域 */}
        {mode === 'puzzle' ? (
          // 时空拼图上传模式
          <PuzzleModeUpload
            uploadedImages={uploadedImages}
            isCheckingFaces={isCheckingFaces}
            onUploadClick={handleUploadClick}
            onRemoveImage={removeImage}
            onVoiceCommand={handleVoiceCommand}
          />
        ) : (
          // 富贵变身上传模式
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
            className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-blue-800 font-medium mb-2 flex items-center">
              <i className="fas fa-lightbulb mr-2"></i>
              拍照建议
            </h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• 选择光线充足的环境</li>
              <li>• 保持正面拍摄，避免侧脸</li>
              <li>• 确保人脸清晰，不要模糊</li>
              <li>• 避免戴墨镜或遮挡面部</li>
            </ul>
          </motion.div>
        )}

        {/* 下一步按钮 */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleNext}
            disabled={!canProceed || isCheckingFaces}
            className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
              canProceed && !isCheckingFaces
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{ minHeight: '48px', minWidth: '260px' }}
          >
            {isCheckingFaces ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                检测人脸中...
              </>
            ) : canProceed ? (
              <>
                <i className="fas fa-arrow-right mr-2"></i>
                下一步
              </>
            ) : (
              <>
                <i className="fas fa-lock mr-2"></i>
                {mode === 'puzzle' ? '请上传至少2张照片' : '请上传1张照片'}
              </>
            )}
          </button>
          
          {uploadedImages.length > 0 && (
            <p className="text-gray-500 text-sm mt-2 text-center">
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
  const maxImages = 5;
  const emptySlots = Math.max(0, maxImages - uploadedImages.length);
  
  return (
    <motion.div
      className="bg-white/80 rounded-xl p-6 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">上传家人照片</h2>
        <button
          onClick={onVoiceCommand}
          className="text-[#6B5CA5] text-sm flex items-center"
        >
          <i className="fas fa-microphone mr-1"></i>
          语音添加
        </button>
      </div>
      
      {/* 圆形上传框网格 */}
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
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#6B5CA5] relative group">
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
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-br-lg font-bold">
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
              
              {/* 悬停时显示所有人脸的缩略图 */}
              {image.faces && image.faces.length > 1 && (
                <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                  <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                    {image.faces.slice(0, 4).map((face, idx) => (
                      <img
                        key={idx}
                        src={`data:image/png;base64,${face.image_base64}`}
                        alt={`Face ${idx + 1}`}
                        className="w-full h-full object-cover rounded-sm"
                      />
                    ))}
                  </div>
                </div>
              )}
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
              <p className="text-green-600 text-xs mt-1 text-center font-medium">
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
              <p className="text-red-600 text-xs mt-1 text-center">
                ⚠️ {image.faceCheckMessage || '检测失败'}
              </p>
            )}
          </motion.div>
        ))}
        
        {/* 空白上传框 */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <motion.button
            key={`empty-${index}`}
            onClick={onUploadClick}
            disabled={isCheckingFaces}
            className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-[#6B5CA5] hover:bg-[#6B5CA5]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <i className="fas fa-plus text-gray-400 text-xl mb-1"></i>
            <span className="text-gray-400 text-xs">添加家人</span>
          </motion.button>
        ))}
      </div>
      
      {/* 底部统计信息 */}
      <div className="mt-4 space-y-2">
        <p className="text-gray-500 text-sm text-center">
          最多上传5张照片，至少需要2张
        </p>
        
        {/* 显示总人脸数 */}
        {uploadedImages.some(img => img.faces && img.faces.length > 0) && (
          <motion.div
            className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center justify-center text-sm">
              <i className="fas fa-users text-purple-600 mr-2"></i>
              <span className="text-gray-700">
                已识别 
                <span className="font-bold text-purple-600 mx-1">
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
      className="bg-white/80 rounded-xl p-6 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-lg font-semibold text-gray-800 mb-4">上传全家福照片</h2>
      
      {uploadedImage ? (
        // 已上传图片预览
        <div className="space-y-4">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="w-full aspect-[7/5] rounded-lg overflow-hidden border-2 border-[#6B5CA5] relative">
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
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center">
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
            
            {/* 删除按钮 */}
            <button
              onClick={() => onRemoveImage(uploadedImage.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg"
            >
              <i className="fas fa-times"></i>
            </button>
          </motion.div>
          
          {/* 提取的人脸展示区域 */}
          {uploadedImage.faces && uploadedImage.faces.length > 0 && (
            <motion.div
              className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <i className="fas fa-user-check text-green-600 mr-2"></i>
                  <h3 className="text-sm font-semibold text-gray-800">
                    检测到的人脸 ({uploadedImage.faces.length})
                  </h3>
                </div>
                {uploadedImage.faces.length > 1 && (
                  <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
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
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-shadow">
                      <img
                        src={`data:image/png;base64,${face.image_base64}`}
                        alt={`Face ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* 人脸序号标签 */}
                    <div className="absolute top-1 left-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      #{index + 1}
                    </div>
                    
                    {/* 置信度标签 */}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center">
                      <i className="fas fa-check-circle mr-1 text-green-400"></i>
                      {Math.round(face.confidence * 100)}%
                    </div>
                    
                    {/* 悬停时显示详细信息 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="text-white text-center text-xs">
                        <p className="font-medium">人脸 {index + 1}</p>
                        <p className="text-[10px] mt-1">
                          位置: ({face.bbox.x}, {face.bbox.y})
                        </p>
                        <p className="text-[10px]">
                          尺寸: {face.bbox.width}×{face.bbox.height}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* 底部提示信息 */}
              <div className="mt-3 pt-3 border-t border-purple-200">
                <div className="flex items-center justify-between text-xs">
                  <p className="text-gray-600 flex items-center">
                    <i className="fas fa-info-circle mr-1"></i>
                    已自动提取照片中的人脸区域
                  </p>
                  {uploadedImage.faces.length > 1 && (
                    <p className="text-green-600 font-medium">
                      <i className="fas fa-check mr-1"></i>
                      适合制作全家福
                    </p>
                  )}
                </div>
                
                {/* 平均置信度 */}
                {uploadedImage.faces.length > 1 && (
                  <div className="mt-2 bg-white rounded-lg p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">平均清晰度:</span>
                      <span className="font-medium text-blue-600">
                        {Math.round(
                          uploadedImage.faces.reduce((sum, f) => sum + f.confidence, 0) / 
                          uploadedImage.faces.length * 100
                        )}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                        style={{ 
                          width: `${Math.round(
                            uploadedImage.faces.reduce((sum, f) => sum + f.confidence, 0) / 
                            uploadedImage.faces.length * 100
                          )}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        // 上传区域
        <div
          ref={dragAreaRef}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onUploadClick}
          className={`w-full aspect-[7/5] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#6B5CA5] bg-[#6B5CA5]/10'
              : 'border-gray-300 hover:border-[#6B5CA5] hover:bg-[#6B5CA5]/5'
          } ${isCheckingFaces ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <i className={`fas fa-cloud-upload-alt text-6xl mb-4 ${isDragging ? 'text-[#6B5CA5]' : 'text-gray-400'}`}></i>
          <p className="text-gray-600 font-medium mb-2">
            {isDragging ? '松开鼠标上传' : '点击上传全家福'}
          </p>
          <p className="text-gray-400 text-sm">
            或拖拽图片到此处
          </p>
          <p className="text-gray-400 text-xs mt-2">
            支持JPG/PNG，最大10MB
          </p>
        </div>
      )}
    </motion.div>
  );
}
