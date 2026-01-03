/**
 * 节气文案组件
 * 在页面顶部显示根据日期自动切换的节气祝福语
 */

import { motion } from 'framer-motion';
import { getFestivalGreeting, getFestivalColor } from '@/lib/festivalGreetings';

interface FestivalGreetingProps {
  className?: string;
}

export default function FestivalGreeting({ className = '' }: FestivalGreetingProps) {
  const greeting = getFestivalGreeting();
  const colors = getFestivalColor();

  return (
    <motion.div
      className={`text-center py-3 px-4 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      }}
    >
      <motion.p
        className="text-white font-medium text-lg flex items-center justify-center"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: 'reverse',
          repeatDelay: 2,
        }}
      >
        <span className="text-2xl mr-2">{greeting.emoji}</span>
        <span>{greeting.greeting}</span>
        <span className="text-2xl ml-2">{greeting.emoji}</span>
      </motion.p>
    </motion.div>
  );
}
