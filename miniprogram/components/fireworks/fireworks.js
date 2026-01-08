/**
 * 烟花动画组件
 * 复用原网页烟花动画效果
 * 在生成成功后展示烟花动画，配"团圆成功"文字
 */
Component({
  properties: {
    // 是否显示烟花
    visible: {
      type: Boolean,
      value: false
    },
    // 动画持续时间（毫秒）
    duration: {
      type: Number,
      value: 2000
    },
    // 显示的文字
    text: {
      type: String,
      value: '🎊 团圆成功 🎊'
    }
  },
  
  data: {
    // 烟花粒子数据
    particles: [],
    // 是否显示文字
    showText: false,
    // Canvas 上下文
    canvasWidth: 0,
    canvasHeight: 0
  },
  
  observers: {
    'visible': function(visible) {
      if (visible) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    }
  },
  
  lifetimes: {
    attached() {
      // 获取屏幕尺寸
      const systemInfo = wx.getSystemInfoSync();
      this.setData({
        canvasWidth: systemInfo.windowWidth,
        canvasHeight: systemInfo.windowHeight
      });
    },
    
    detached() {
      this.stopAnimation();
    }
  },
  
  methods: {
    // 开始动画
    startAnimation() {
      // 生成烟花粒子
      this.generateFireworks();
      
      // 延迟显示文字
      setTimeout(() => {
        this.setData({ showText: true });
      }, 200);
      
      // 播放成功音效
      this.playSuccessSound();
      
      // 动画结束后触发事件
      setTimeout(() => {
        this.triggerEvent('complete');
      }, this.data.duration);
    },
    
    // 停止动画
    stopAnimation() {
      this.setData({
        particles: [],
        showText: false
      });
    },
    
    // 生成烟花粒子
    generateFireworks() {
      const colors = ['#D4302B', '#D4AF37', '#FFD700', '#FF6B6B', '#FFA500'];
      const particles = [];
      const { canvasWidth, canvasHeight } = this.data;
      
      // 生成5个烟花爆炸点
      for (let i = 0; i < 5; i++) {
        const centerX = Math.random() * canvasWidth;
        const centerY = Math.random() * canvasHeight * 0.5 + canvasHeight * 0.2;
        const color = colors[i % colors.length];
        
        // 每个烟花生成多个粒子
        for (let j = 0; j < 12; j++) {
          const angle = (Math.PI * 2 * j) / 12;
          const distance = 50 + Math.random() * 50;
          
          particles.push({
            id: `${i}-${j}`,
            x: centerX,
            y: centerY,
            endX: centerX + Math.cos(angle) * distance,
            endY: centerY + Math.sin(angle) * distance,
            color,
            delay: i * 200,
            size: 4 + Math.random() * 4
          });
        }
      }
      
      this.setData({ particles });
    },
    
    // 播放成功音效
    playSuccessSound() {
      // 使用微信内置音效
      try {
        wx.vibrateShort({ type: 'heavy' });
      } catch (error) {
        console.warn('震动反馈失败:', error);
      }
    }
  }
});
