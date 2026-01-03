import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  showText?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  showText = true,
  className = '' 
}) => {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={className}>
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      {showText && (
        <div className="progress-text">
          {normalizedProgress}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
