/**
 * 背景音乐上下文
 * 管理全局背景音乐播放状态
 */

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface MusicContextType {
  isMusicEnabled: boolean;
  toggleMusic: () => void;
  isPlaying: boolean;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
  children: ReactNode;
}

const MUSIC_ENABLED_KEY = 'ai-family-photo-music-enabled';

// 春节轻音乐 - 使用Web Audio API生成简单的旋律
// 实际项目中应该使用真实的音频文件
const SPRING_FESTIVAL_MELODY = [
  // 音符格式: { frequency: Hz, duration: 秒 }
  { freq: 523.25, duration: 0.3 }, // C5
  { freq: 587.33, duration: 0.3 }, // D5
  { freq: 659.25, duration: 0.3 }, // E5
  { freq: 698.46, duration: 0.3 }, // F5
  { freq: 783.99, duration: 0.6 }, // G5
  { freq: 698.46, duration: 0.3 }, // F5
  { freq: 659.25, duration: 0.3 }, // E5
  { freq: 587.33, duration: 0.6 }, // D5
  { freq: 523.25, duration: 0.9 }, // C5
];

export function MusicProvider({ children }: MusicProviderProps) {
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem(MUSIC_ENABLED_KEY);
    return saved === 'true';
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentNoteIndexRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  // 初始化AudioContext
  useEffect(() => {
    if (isMusicEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext初始化失败:', error);
      }
    }
  }, [isMusicEnabled]);

  // 播放单个音符
  const playNote = (frequency: number, duration: number) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // 音量淡入淡出
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05); // 淡入
    gainNode.gain.linearRampToValueAtTime(0.1, now + duration - 0.05); // 保持
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // 淡出

    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  // 播放旋律循环
  const playMelody = () => {
    if (!isMusicEnabled || !audioContextRef.current) return;

    const note = SPRING_FESTIVAL_MELODY[currentNoteIndexRef.current];
    playNote(note.freq, note.duration);

    // 下一个音符
    currentNoteIndexRef.current = (currentNoteIndexRef.current + 1) % SPRING_FESTIVAL_MELODY.length;

    // 设置下一个音符的播放时间
    timeoutRef.current = window.setTimeout(() => {
      playMelody();
    }, note.duration * 1000);
  };

  // 停止播放
  const stopMelody = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    currentNoteIndexRef.current = 0;
    setIsPlaying(false);
  };

  // 切换音乐
  const toggleMusic = () => {
    setIsMusicEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(MUSIC_ENABLED_KEY, String(newValue));
      
      if (!newValue) {
        stopMelody();
      }
      
      return newValue;
    });
  };

  // 音乐开启时自动播放
  useEffect(() => {
    if (isMusicEnabled && !isPlaying) {
      setIsPlaying(true);
      playMelody();
    } else if (!isMusicEnabled && isPlaying) {
      stopMelody();
    }

    return () => {
      stopMelody();
    };
  }, [isMusicEnabled]);

  // 页面可见性变化时暂停/恢复音乐
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        stopMelody();
      } else if (!document.hidden && isMusicEnabled && !isPlaying) {
        setIsPlaying(true);
        playMelody();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMusicEnabled, isPlaying]);

  const value: MusicContextType = {
    isMusicEnabled,
    toggleMusic,
    isPlaying,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

/**
 * 使用背景音乐上下文的Hook
 */
export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
