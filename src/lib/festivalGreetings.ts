/**
 * 节气文案工具
 * 根据日期自动切换页面顶部文案
 */

interface FestivalGreeting {
  name: string;
  greeting: string;
  emoji: string;
}

/**
 * 获取当前节气文案
 * 根据日期返回对应的春节祝福语
 */
export function getFestivalGreeting(): FestivalGreeting {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-11 -> 1-12
  const day = now.getDate();

  // 2026年春节相关日期（农历）
  // 除夕: 2026年2月16日
  // 初一: 2026年2月17日
  // 元宵: 2026年3月3日
  
  // 为了演示，我们使用公历日期范围来判断
  // 实际项目中可以使用农历库如 lunar-javascript
  
  // 除夕（2月16日）
  if (month === 2 && day === 16) {
    return {
      name: '除夕',
      greeting: '除夕团圆，万事顺遂',
      emoji: '🧧'
    };
  }
  
  // 初一（2月17日）
  if (month === 2 && day === 17) {
    return {
      name: '大年初一',
      greeting: '新年快乐，阖家欢乐',
      emoji: '🎊'
    };
  }
  
  // 元宵（3月3日）
  if (month === 3 && day === 3) {
    return {
      name: '元宵节',
      greeting: '元宵佳节，团团圆圆',
      emoji: '🏮'
    };
  }
  
  // 春节期间（2月17日-3月2日）
  if ((month === 2 && day >= 17) || (month === 3 && day <= 2)) {
    return {
      name: '春节',
      greeting: '春节快乐，福运连连',
      emoji: '🎉'
    };
  }
  
  // 春节前（2月1日-2月15日）
  if (month === 2 && day >= 1 && day <= 15) {
    return {
      name: '迎春',
      greeting: '新春将至，提前拜年',
      emoji: '🎋'
    };
  }
  
  // 春节后（3月4日-3月31日）
  if (month === 3 && day >= 4) {
    return {
      name: '春暖花开',
      greeting: '春暖花开，万象更新',
      emoji: '🌸'
    };
  }
  
  // 其他时间（默认）
  return {
    name: '团圆时刻',
    greeting: '这个春节，让爱没有距离',
    emoji: '❤️'
  };
}

/**
 * 获取节气装饰元素
 * 根据节气返回对应的装饰元素类名
 */
export function getFestivalDecoration(): string {
  const greeting = getFestivalGreeting();
  
  switch (greeting.name) {
    case '除夕':
    case '大年初一':
      return 'festival-fireworks'; // 烟花装饰
    case '元宵节':
      return 'festival-lanterns'; // 灯笼装饰
    case '春节':
      return 'festival-spring'; // 春节装饰
    default:
      return 'festival-default'; // 默认装饰
  }
}

/**
 * 获取节气主题色
 */
export function getFestivalColor(): { primary: string; secondary: string } {
  const greeting = getFestivalGreeting();
  
  switch (greeting.name) {
    case '除夕':
    case '大年初一':
      return { primary: '#D4302B', secondary: '#D4AF37' }; // 中国红+金色
    case '元宵节':
      return { primary: '#FF6B6B', secondary: '#FFD700' }; // 亮红+金黄
    case '春节':
      return { primary: '#E74C3C', secondary: '#F39C12' }; // 橙红+橙黄
    default:
      return { primary: '#D4302B', secondary: '#D4AF37' }; // 默认中国红+金色
  }
}
