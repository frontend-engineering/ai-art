import React from 'react';
import lanternImg from '../assets/lantern.png';

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
  const sizeMap = {
    small: '50px',
    medium: '80px',
    large: '120px'
  };
  
  return (
    <div className={`loading-container ${className}`}>
      <div className="loading-lantern-wrapper">
        <img 
          src={lanternImg}
          alt="loading"
          className="animate-lantern-spin" 
          style={{ 
            width: sizeMap[size],
            height: sizeMap[size],
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loading;
