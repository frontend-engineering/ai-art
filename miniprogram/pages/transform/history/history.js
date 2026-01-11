/**
 * 富贵变身模式历史记录页
 * Requirements: 2.3, 11.1-11.4
 * 
 * 功能：
 * - 复用原网页 TransformHistoryPage 样式
 * - 实现历史记录列表展示
 * - 实现点击查看详情
 * - 实现删除功能
 */

const { getHistory, deleteHistory } = require('../../../utils/storage');
const { cloudRequest } = require('../../../utils/cloudbase-request');

Page({
  data: {
    isElderMode: false,
    records: [],
    loading: true,
    error: null
  },

  onLoad() {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
    
    this.fetchHistory();
  },

  onShow() {
    const app = getApp();
    this.setData({
      isElderMode: app.globalData.isElderMode
    });
    
    // 每次显示时刷新数据
    this.fetchHistory();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.fetchHistory().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 获取历史记录
   * Requirements: 11.1
   */
  async fetchHistory() {
    this.setData({ loading: true, error: null });
    
    try {
      // 先从本地获取
      const localRecords = getHistory('transform');
      console.log('[TransformHistory] 本地记录:', localRecords.length);
      
      // 尝试从服务器获取
      const userId = wx.getStorageSync('userId');
      if (userId) {
        try {
          // 使用 cloudRequest 获取历史记录
          const result = await cloudRequest({
            path: `/api/history/user/${userId}?limit=20`,
            method: 'GET',
            showError: false
          });
          
          if (result.success && result.data && result.data.length > 0) {
            // 合并服务器和本地记录，去重
            const serverRecords = result.data.map(r => ({
              id: r.id,
              originalImages: r.original_image_urls || [],
              generatedImage: r.selected_image_url || (r.generated_image_urls && r.generated_image_urls[0]) || '',
              generatedImages: r.generated_image_urls || [],
              createdAt: r.created_at,
              status: r.status,
              mode: 'transform'
            }));
            
            // 合并去重
            const allRecords = [...serverRecords];
            localRecords.forEach(local => {
              if (!allRecords.find(r => r.id === local.id)) {
                allRecords.push(local);
              }
            });
            
            // 按时间排序
            allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            this.setData({
              records: allRecords,
              loading: false
            });
            return;
          }
        } catch (err) {
          console.log('[TransformHistory] 服务器获取失败，使用本地数据:', err);
        }
      }
      
      // 使用本地记录
      this.setData({
        records: localRecords,
        loading: false
      });
      
    } catch (err) {
      console.error('[TransformHistory] 获取历史记录失败:', err);
      this.setData({
        error: '加载历史记录失败',
        loading: false
      });
    }
  },

  /**
   * 点击记录查看详情
   * Requirements: 11.2
   */
  handleRecordClick(e) {
    const { record } = e.currentTarget.dataset;
    
    if (!record) return;
    
    // 如果有多张生成图片，跳转到选择页
    if (record.generatedImages && record.generatedImages.length > 1) {
      const app = getApp();
      app.globalData.transformData = {
        generatedImages: record.generatedImages,
        uploadedImages: record.originalImages,
        taskId: record.id
      };
      
      wx.navigateTo({
        url: '/pages/transform/result-selector/result-selector'
      });
    } else if (record.generatedImage) {
      // 只有一张图片，直接跳转到结果页
      wx.navigateTo({
        url: `/pages/transform/result/result?image=${encodeURIComponent(record.generatedImage)}`
      });
    } else {
      wx.showToast({
        title: '该记录暂无可查看的图片',
        icon: 'none'
      });
    }
  },

  /**
   * 删除记录
   * Requirements: 11.4
   */
  handleDelete(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmColor: '#D4302B',
      success: (res) => {
        if (res.confirm) {
          this.doDelete(id);
        }
      }
    });
  },

  /**
   * 执行删除
   */
  doDelete(id) {
    // 从本地删除
    deleteHistory(id);
    
    // 更新列表
    const records = this.data.records.filter(r => r.id !== id);
    this.setData({ records });
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
  },

  /**
   * 去制作
   */
  goCreate() {
    wx.navigateTo({
      url: '/pages/transform/upload/upload'
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/transform/launch/launch'
        });
      }
    });
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      pending: '等待中',
      processing: '生成中',
      completed: '已完成',
      failed: '失败'
    };
    return statusMap[status] || status || '已完成';
  },

  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    const classMap = {
      pending: 'status-pending',
      processing: 'status-processing',
      completed: 'status-completed',
      failed: 'status-failed'
    };
    return classMap[status] || 'status-completed';
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '富贵变身 - 我的生成记录',
      path: '/pages/transform/launch/launch',
      imageUrl: '/assets/images/share-transform.png'
    };
  }
});
