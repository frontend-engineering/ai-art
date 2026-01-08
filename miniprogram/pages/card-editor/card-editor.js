/**
 * 贺卡编辑页
 * Requirements: 2.4, 13.1-13.5
 * 
 * 功能：
 * - 复用原网页 CardEditor 样式
 * - 实现祝福语编辑
 * - 实现贺卡模板选择
 * - 实现预览和保存
 */

const { savePosterToAlbum } = require('../../utils/share');

// 贺卡模板配置
const CARD_TEMPLATES = [
  {
    id: 'card-1',
    name: '新春祝福',
    url: '/assets/templates/cards/spring-blessing.jpg',
    textColor: '#FFD700',
    textPosition: 'bottom'
  },
  {
    id: 'card-2',
    name: '团圆美满',
    url: '/assets/templates/cards/reunion.jpg',
    textColor: '#FFFFFF',
    textPosition: 'bottom'
  },
  {
    id: 'card-3',
    name: '福气满满',
    url: '/assets/templates/cards/fortune.jpg',
    textColor: '#FFD700',
    textPosition: 'center'
  },
  {
    id: 'card-4',
    name: '恭贺新禧',
    url: '/assets/templates/cards/new-year.jpg',
    textColor: '#FFFFFF',
    textPosition: 'bottom'
  }
];

// 预设祝福语
const PRESET_BLESSINGS = [
  '新春快乐，阖家幸福！',
  '恭喜发财，万事如意！',
  '龙年大吉，福气满满！',
  '团团圆圆，幸福美满！',
  '身体健康，平安喜乐！'
];

Page({
  data: {
    isElderMode: false,
    imageUrl: '',
    templates: CARD_TEMPLATES,
    presetBlessings: PRESET_BLESSINGS,
    selectedTemplate: null,
    blessing: '新春快乐，阖家幸福！',
    showPreview: false,
    isSaving: false,
    isGenerating: false
  },

  onLoad(options) {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
    
    // 获取图片URL
    if (options.image) {
      this.setData({
        imageUrl: decodeURIComponent(options.image)
      });
    }
    
    // 默认选中第一个模板
    this.setData({
      selectedTemplate: CARD_TEMPLATES[0]
    });
  },

  onShow() {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
  },

  /**
   * 选择模板
   */
  handleTemplateSelect(e) {
    const { template } = e.currentTarget.dataset;
    this.setData({ selectedTemplate: template });
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 选择预设祝福语
   */
  handleBlessingSelect(e) {
    const { blessing } = e.currentTarget.dataset;
    this.setData({ blessing });
  },

  /**
   * 输入祝福语
   */
  handleBlessingInput(e) {
    this.setData({ blessing: e.detail.value });
  },

  /**
   * 预览贺卡
   */
  handlePreview() {
    const { selectedTemplate, blessing } = this.data;
    
    if (!selectedTemplate) {
      wx.showToast({
        title: '请先选择模板',
        icon: 'none'
      });
      return;
    }
    
    if (!blessing.trim()) {
      wx.showToast({
        title: '请输入祝福语',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ showPreview: true });
  },

  /**
   * 关闭预览
   */
  closePreview() {
    this.setData({ showPreview: false });
  },

  /**
   * 保存贺卡
   */
  async handleSave() {
    const { isSaving, selectedTemplate, blessing, imageUrl } = this.data;
    
    if (isSaving) return;
    
    if (!selectedTemplate || !blessing.trim()) {
      wx.showToast({
        title: '请完善贺卡内容',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isSaving: true });
    
    try {
      wx.showLoading({ title: '生成贺卡中...', mask: true });
      
      // 这里应该调用后端API生成贺卡
      // 目前先模拟保存原图
      if (imageUrl) {
        const downloadRes = await new Promise((resolve, reject) => {
          wx.downloadFile({
            url: imageUrl,
            success: resolve,
            fail: reject
          });
        });
        
        if (downloadRes.statusCode === 200) {
          await savePosterToAlbum(downloadRes.tempFilePath);
        }
      }
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      this.setData({ showPreview: false });
      
    } catch (err) {
      console.error('[CardEditor] 保存失败:', err);
      wx.hideLoading();
      
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '提示',
          content: '需要您授权保存图片到相册',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ isSaving: false });
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/launch/launch'
        });
      }
    });
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '我制作了一张拜年贺卡，快来看看！',
      path: '/pages/launch/launch',
      imageUrl: this.data.imageUrl || '/assets/images/share-card.png'
    };
  }
});
