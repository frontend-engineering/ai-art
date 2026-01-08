/**
 * 音乐开关组件
 * 复用原网页 MusicToggle 样式
 * 中国风设计，带有明确的音乐图标
 */
Component({
  properties: {
    // 位置: bottom-right, bottom-left, top-right, top-left
    position: {
      type: String,
      value: 'bottom-right'
    }
  },
  
  data: {
    isMusicEnabled: false,
    isPlaying: false
  },
  
  lifetimes: {
    attached() {
      const app = getApp();
      this.setData({
        isMusicEnabled: app.globalData.isMusicPlaying,
        isPlaying: app.globalData.isMusicPlaying
      });
    }
  },
  
  methods: {
    // 切换音乐
    toggleMusic() {
      const app = getApp();
      app.toggleMusic();
      
      this.setData({
        isMusicEnabled: app.globalData.isMusicPlaying,
        isPlaying: app.globalData.isMusicPlaying
      });
      
      // 震动反馈
      wx.vibrateShort({ type: 'light' });
    }
  }
});
