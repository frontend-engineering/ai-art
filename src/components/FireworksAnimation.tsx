/**
 * 烟花动画组件
 * 在生成成功后展示1秒烟花动画，配"团圆成功"音效
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FireworksAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export default function FireworksAnimation({ isVisible, onComplete }: FireworksAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 播放音效
    playSuccessSound();

    // 创建烟花粒子
    const colors = ['#D4302B', '#D4AF37', '#FFD700', '#FF6B6B', '#FFA500'];
    const fireworksCount = 5; // 5个烟花爆炸点

    for (let i = 0; i < fireworksCount; i++) {
      setTimeout(() => {
        createFirework(
          Math.random() * canvas.width,
          Math.random() * canvas.height * 0.5 + canvas.height * 0.2,
          colors[i % colors.length]
        );
      }, i * 200);
    }

    // 动画循环
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      // 1秒后停止动画
      if (elapsed > 1000) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (onComplete) {
          onComplete();
        }
        return;
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // 重力
        particle.life--;

        if (particle.life <= 0) return false;

        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isVisible, onComplete]);

  const createFirework = (x: number, y: number, color: string) => {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 3 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 60,
        maxLife: 60,
      });
    }
  };

  const playSuccessSound = () => {
    // 使用Web Audio API生成简单的成功音效
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建音符序列（模拟"团圆成功"的欢快音效）
      const notes = [
        { freq: 523.25, time: 0, duration: 0.15 },    // C5
        { freq: 659.25, time: 0.15, duration: 0.15 }, // E5
        { freq: 783.99, time: 0.3, duration: 0.3 },   // G5
      ];

      notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + note.time);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + note.time + note.duration
        );

        oscillator.start(audioContext.currentTime + note.time);
        oscillator.stop(audioContext.currentTime + note.time + note.duration);
      });
    } catch (error) {
      console.warn('音效播放失败:', error);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
          
          {/* "团圆成功"文字 */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              delay: 0.2,
              duration: 0.5,
              type: "spring",
              stiffness: 200
            }}
          >
            <div className="bg-gradient-to-r from-[#D4302B] to-[#D4AF37] text-white px-8 py-4 rounded-2xl shadow-2xl">
              <h2 className="text-4xl font-bold text-center whitespace-nowrap">
                🎊 团圆成功 🎊
              </h2>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
