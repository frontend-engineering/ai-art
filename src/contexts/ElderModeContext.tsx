/**
 * 老年模式上下文
 * 管理老年模式状态和语音引导功能
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ElderModeContextType {
  isElderMode: boolean;
  toggleElderMode: () => void;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const ElderModeContext = createContext<ElderModeContextType | undefined>(undefined);

interface ElderModeProviderProps {
  children: ReactNode;
}

const ELDER_MODE_KEY = 'ai-family-photo-elder-mode';
const VOICE_ENABLED_KEY = 'ai-family-photo-voice-enabled';

export function ElderModeProvider({ children }: ElderModeProviderProps) {
  // 从localStorage读取初始状态
  const [isElderMode, setIsElderMode] = useState(() => {
    const saved = localStorage.getItem(ELDER_MODE_KEY);
    return saved === 'true';
  });

  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem(VOICE_ENABLED_KEY);
    return saved === 'true';
  });

  // 切换老年模式
  const toggleElderMode = () => {
    setIsElderMode(prev => {
      const newValue = !prev;
      localStorage.setItem(ELDER_MODE_KEY, String(newValue));
      
      // 切换时播放提示音
      if (voiceEnabled && 'speechSynthesis' in window) {
        const text = newValue ? '已开启老年模式，字体和按钮已放大' : '已关闭老年模式';
        speak(text);
      }
      
      return newValue;
    });
  };

  // 切换语音引导
  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(VOICE_ENABLED_KEY, String(newValue));
      
      // 切换时播放提示音
      if (newValue && 'speechSynthesis' in window) {
        speak('语音引导已开启');
      }
      
      return newValue;
    });
  };

  // 语音播报
  const speak = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    // 停止当前播报
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85; // 稍慢的语速，更适合老年人
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  // 停止语音播报
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // 应用老年模式样式
  useEffect(() => {
    if (isElderMode) {
      document.documentElement.classList.add('elder-mode');
    } else {
      document.documentElement.classList.remove('elder-mode');
    }
  }, [isElderMode]);

  // 组件卸载时停止语音
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const value: ElderModeContextType = {
    isElderMode,
    toggleElderMode,
    voiceEnabled,
    toggleVoice,
    speak,
    stopSpeaking,
  };

  return (
    <ElderModeContext.Provider value={value}>
      {children}
    </ElderModeContext.Provider>
  );
}

/**
 * 使用老年模式上下文的Hook
 */
export function useElderMode() {
  const context = useContext(ElderModeContext);
  if (context === undefined) {
    throw new Error('useElderMode must be used within an ElderModeProvider');
  }
  return context;
}
