/**
 * 老年模式切换按钮组件
 * 显示在页面右上角，带老人图标
 */

import { motion } from 'framer-motion';
import { useElderMode } from '@/contexts/ElderModeContext';

interface ElderModeToggleProps {
  className?: string;
}

export default function ElderModeToggle({ className = '' }: ElderModeToggleProps) {
  const { isElderMode, toggleElderMode, voiceEnabled, toggleVoice } = useElderMode();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 语音开关 */}
      <motion.button
        onClick={toggleVoice}
        className={`p-2 rounded-full transition-all ${
          voiceEnabled
            ? 'bg-[#6B5CA5] text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title={voiceEnabled ? '关闭语音' : '开启语音'}
      >
        <i className={`fas fa-${voiceEnabled ? 'volume-up' : 'volume-mute'} text-lg`}></i>
      </motion.button>

      {/* 老年模式开关 */}
      <motion.button
        onClick={toggleElderMode}
        className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
          isElderMode
            ? 'bg-[#D4302B] text-white'
            : 'bg-gray-200 text-gray-700'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isElderMode ? '关闭老年模式' : '开启老年模式'}
      >
        <i className="fas fa-user-friends text-lg"></i>
        <span className="text-sm font-medium">
          {isElderMode ? '老年模式' : '标准模式'}
        </span>
      </motion.button>
    </div>
  );
}
