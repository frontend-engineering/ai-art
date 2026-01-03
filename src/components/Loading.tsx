import React from 'react';

interface LoadingProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  text = '加载中...', 
  size = 'medium',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'text-[40px]',
    medium: 'text-[80px]',
    large: 'text-[120px]'
  };
  
  return (
    <div className={`loading-container ${className}`}>
      <div 
        className="loading-lantern" 
        style={{ fontSize: size === 'small' ? '40px' : size === 'large' ? '120px' : '80px' }}
      >
        🏮
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loading;
