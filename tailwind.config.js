/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 统一色调系统
        'festival-red': '#D4302B',      // 主色：中国红
        'festival-gold': '#D4AF37',     // 辅色：金色
        'festival-warm': '#FFF8F0',     // 背景：暖白
        'festival-red-light': '#E84A3D', // 红色渐变辅助色
        'festival-red-dark': '#B82820',  // 红色深色
      },
      fontFamily: {
        // 统一字体规范
        'title': ['"HYShangWeiShouShuW"', '"PingFang SC"', '"Source Han Sans CN"', 'sans-serif'], // 标题字体：汉仪尚巍手书
        'body': ['"PingFang SC"', '"Source Han Sans CN"', 'sans-serif'], // 正文字体：苹方/思源黑体
      },
      fontSize: {
        // 统一字体大小
        'title-lg': ['28px', { lineHeight: '1.3' }],  // 大标题
        'title-md': ['24px', { lineHeight: '1.3' }],  // 中标题
        'body': ['18px', { lineHeight: '1.5' }],      // 正文
        'caption': ['16px', { lineHeight: '1.5' }],   // 说明文字
      },
      borderRadius: {
        // 统一圆角规范
        'festival': '8px',      // 标准圆角：所有按钮/卡片
        'festival-lg': '12px',  // 大圆角：弹窗
      },
      boxShadow: {
        // 统一阴影规范
        'festival': '0 2px 8px rgba(0, 0, 0, 0.08)',           // 默认阴影
        'festival-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',   // hover阴影
        'festival-active': '0 1px 4px rgba(0, 0, 0, 0.1)',    // active阴影
      },
    },
  },
  plugins: [],
  safelist: [
    // 按钮样式类
    'btn-festival',
    'btn-primary',
    'btn-secondary',
    'btn-function',
    'btn-function-gold',
    'btn-function-purple',
    'btn-function-gray',
    // 弹窗样式类
    'modal-festival',
    'modal-festival-overlay',
    // 加载和提示样式类
    'loading-lantern',
    'toast-success',
    'toast-error',
    'toast-info',
  ],
};
