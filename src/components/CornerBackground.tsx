import { ReactNode } from 'react';

// 导入四个角的图片
import topLeft from '@/assets/bg-corners/top-left.png';
import topRight from '@/assets/bg-corners/top-right.png';
import bottomLeft from '@/assets/bg-corners/bottom-left.png';
import bottomRight from '@/assets/bg-corners/bottom-right.png';

interface CornerBackgroundProps {
  children: ReactNode;
}

/**
 * 四角背景组件
 * 将背景图片分成四个角固定在页面四角，中间用渐变色填充
 * 背景色从顶部 rgb(180, 56, 45) 渐变到底部 rgb(159, 40, 38)
 * 这样可以适配不同尺寸的屏幕
 */
export default function CornerBackground({ 
  children
}: CornerBackgroundProps) {
  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden" 
      style={{ 
        background: 'linear-gradient(to bottom, rgb(180, 56, 45) 0%, rgb(159, 40, 38) 100%)'
      }}
    >
      {/* 左上角 */}
      <div 
        className="absolute top-0 left-0 w-1/2 h-1/2 pointer-events-none"
        style={{ 
          backgroundImage: `url(${topLeft})`,
          backgroundSize: 'contain',
          backgroundPosition: 'top left',
          backgroundRepeat: 'no-repeat',
          // 使用径向渐变遮罩，从角落向中心淡出
          WebkitMaskImage: 'radial-gradient(ellipse 120% 120% at top left, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 120% 120% at top left, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          // 使用混合模式让颜色更自然融合
          mixBlendMode: 'normal',
          opacity: 0.95
        }}
      />
      
      {/* 右上角 */}
      <div 
        className="absolute top-0 right-0 w-1/2 h-1/2 pointer-events-none"
        style={{ 
          backgroundImage: `url(${topRight})`,
          backgroundSize: 'contain',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          // 使用径向渐变遮罩，从角落向中心淡出
          WebkitMaskImage: 'radial-gradient(ellipse 120% 120% at top right, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 120% 120% at top right, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          mixBlendMode: 'normal',
          opacity: 0.95
        }}
      />
      
      {/* 左下角 */}
      <div 
        className="absolute bottom-0 left-0 w-1/2 h-1/2 pointer-events-none"
        style={{ 
          backgroundImage: `url(${bottomLeft})`,
          backgroundSize: 'contain',
          backgroundPosition: 'bottom left',
          backgroundRepeat: 'no-repeat',
          // 使用径向渐变遮罩，从角落向中心淡出
          WebkitMaskImage: 'radial-gradient(ellipse 120% 120% at bottom left, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 120% 120% at bottom left, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          mixBlendMode: 'normal',
          opacity: 0.95
        }}
      />
      
      {/* 右下角 */}
      <div 
        className="absolute bottom-0 right-0 w-1/2 h-1/2 pointer-events-none"
        style={{ 
          backgroundImage: `url(${bottomRight})`,
          backgroundSize: 'contain',
          backgroundPosition: 'bottom right',
          backgroundRepeat: 'no-repeat',
          // 使用径向渐变遮罩，从角落向中心淡出
          WebkitMaskImage: 'radial-gradient(ellipse 120% 120% at bottom right, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 120% 120% at bottom right, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          mixBlendMode: 'normal',
          opacity: 0.95
        }}
      />
      
      {/* 中心渐变叠加层 - 进一步柔化边缘 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at center, transparent 0%, rgba(180, 56, 45, 0.3) 100%)',
          opacity: 0.3
        }}
      />
      
      {/* 内容区域 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
