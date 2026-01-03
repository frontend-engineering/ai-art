import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import { getFriendlyError, type FriendlyError } from "./errorMessages"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 显示友好的错误提示（使用 Sonner Toast）
export function showFriendlyError(error: string | Error) {
  const friendlyError = getFriendlyError(error);
  
  // 使用 Sonner 的自定义 toast 显示友好错误
  toast.error(
    `${friendlyError.emoji} ${friendlyError.title}`,
    {
      description: `${friendlyError.message}\n\n💡 ${friendlyError.solution}`,
      duration: 6000,
      style: {
        background: 'white',
        border: '2px solid #FEE2E2',
        borderRadius: '12px',
        padding: '16px',
      },
    }
  );
  
  return friendlyError;
}

// 显示友好的错误提示（使用模态框）
export function showFriendlyErrorModal(
  error: string | Error
): FriendlyError {
  const friendlyError = getFriendlyError(error);
  
  // 这个函数返回错误对象，由调用方决定如何显示
  // 通常配合 FriendlyErrorToast 组件使用
  return friendlyError;
}

// 格式化日期时间
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 模拟AI生成艺术照的延迟函数
export function simulateAIGeneration(): Promise<void> {
  return new Promise((resolve) => {
    // 模拟3-5秒的生成时间
    const delay = Math.floor(Math.random() * 2000) + 3000;
    setTimeout(resolve, delay);
  });
}

// 上传图片到后端代理服务
export async function uploadImageToOSS(base64Image: string): Promise<string> {
  try {
    // 后端代理服务地址
    const backendProxy = 'http://localhost:3001';
    
    const response = await fetch(`${backendProxy}/api/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image })
    });
    
    const result = await response.json();
    
    // 检查API调用是否成功
    if (!response.ok) {
      throw new Error(result?.message || `API调用失败，状态码: ${response.status}`);
    }
    
    if (!result?.success) {
      throw new Error(result?.message || 'API调用失败');
    }
    
    // 返回上传后的图片URL
    return result.data?.imageUrl || '';
  } catch (error) {
    console.error('上传图片到OSS失败:', error);
    throw new Error(error instanceof Error ? error.message : '图片上传失败，请稍后重试');
  }
}

// 获取模板图片列表
export async function getTemplateImages(): Promise<string[]> {
  try {
    // 生成最近10个模板图片URL
    const templates: string[] = [];
    for (let i = 1; i <= 10; i++) {
      templates.push(`https://wms.webinfra.cloud/art-photos/template${i}.jpeg`);
    }
    return templates;
  } catch (error) {
    console.error('获取模板图片列表失败:', error);
    // 返回默认模板列表
    return [
      'https://wms.webinfra.cloud/art-photos/template1.jpeg',
      'https://wms.webinfra.cloud/art-photos/template2.jpeg',
      'https://wms.webinfra.cloud/art-photos/template3.jpeg',
      'https://wms.webinfra.cloud/art-photos/template4.jpeg',
      'https://wms.webinfra.cloud/art-photos/template5.jpeg'
    ];
  }
}

// 批量上传图片到OSS
export async function uploadImagesToOSS(base64Images: string[]): Promise<string[]> {
  const imageUrls: string[] = [];
  
  // 限制最多上传10张图片
  const imagesToUpload = base64Images.slice(0, 10);
  
  for (const image of imagesToUpload) {
    try {
      const url = await uploadImageToOSS(image);
      imageUrls.push(url);
    } catch (error) {
      console.error('上传单张图片失败:', error);
      throw error; // 如果任何一张图片上传失败，抛出错误
    }
  }
  
  return imageUrls;
}