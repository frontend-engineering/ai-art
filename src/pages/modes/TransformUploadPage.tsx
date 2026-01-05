import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { faceAPI } from '@/lib/api';
import { TRANSFORM_MODE } from '@/config/modes';
import transformUploadBg from '@/assets/transform-upload.png';
import PageTransition from '@/components/PageTransition';

export default function TransformUploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isUploading) return;
    setErrorMessage('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件格式
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setErrorMessage('请上传JPG或PNG格式的图片');
      return;
    }

    // 检查文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('图片文件过大，请上传小于10MB的图片');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      // 读取文件为 base64
      setStatusText('正在读取图片...');
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error('读取文件失败'));
          }
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });

      // 直接使用 base64 进行人脸检测（避免 URL 下载问题）
      setStatusText('正在检测人脸...');
      const result = await faceAPI.extractFaces([dataUrl]);

      if (!result.success || !result.faces || result.faces.length === 0) {
        setErrorMessage(result.message || '未检测到人脸，请重新上传清晰的照片');
        setIsUploading(false);
        setStatusText('');
        return;
      }

      // 检测成功，自动进入下一步
      setStatusText('检测成功，正在跳转...');
      setTimeout(() => {
        navigate(`${TRANSFORM_MODE.slug}/template`, {
          state: {
            mode: 'transform',
            uploadedImages: [dataUrl],
            faces: result.faces
          }
        });
      }, 300);

    } catch (error) {
      console.error('上传失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '上传失败，请重试');
      setIsUploading(false);
      setStatusText('');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full relative overflow-hidden">
        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
        />

        {/* 完整背景图 - 可点击触发上传 */}
        <div
          onClick={handleClick}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${
            isUploading ? 'cursor-wait' : 'cursor-pointer'
          }`}
          style={{
            backgroundImage: `url(${transformUploadBg})`,
          }}
        >
          {/* 上传中的遮罩 */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FFD700]"></div>
              {statusText && (
                <p className="text-white text-lg mt-4 font-medium">{statusText}</p>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {errorMessage && !isUploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm mx-4 text-center">
                <p className="text-lg font-medium mb-2">⚠️ {errorMessage}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setErrorMessage('');
                  }}
                  className="mt-2 px-4 py-2 bg-white text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
