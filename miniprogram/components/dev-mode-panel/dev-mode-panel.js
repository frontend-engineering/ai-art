/**
 * 开发者模式面板组件
 * 用于调试和测试，允许随意修改使用次数
 */

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    usageCount: {
      type: Number,
      value: 0
    }
  },

  data: {
    inputValue: '',
    loading: false,
    message: '',
    messageType: 'info' // 'info', 'success', 'error'
  },

  methods: {
    /**
     * 关闭面板
     */
    close() {
      this.triggerEvent('close');
    },

    /**
     * 输入框变化
     */
    onInput(e) {
      this.setData({
        inputValue: e.detail.value
      });
    },

    /**
     * 设置使用次数
     */
    async setUsageCount() {
      const count = parseInt(this.data.inputValue);
      
      if (isNaN(count) || count < 0) {
        this.showMessage('请输入有效的非负整数', 'error');
        return;
      }

      await this.callDevAPI('set', { count });
    },

    /**
     * 增加使用次数
     */
    async addUsageCount() {
      const amount = parseInt(this.data.inputValue);
      
      if (isNaN(amount) || amount === 0) {
        this.showMessage('请输入非零数字', 'error');
        return;
      }

      await this.callDevAPI('add', { amount });
    },

    /**
     * 快速设置
     */
    async quickSet(e) {
      const count = e.currentTarget.dataset.count;
      await this.callDevAPI('set', { count });
    },

    /**
     * 调用开发者 API
     */
    async callDevAPI(action, params) {
      this.setData({ loading: true });

      try {
        const app = getApp();
        const userId = app.globalData.userId;

        if (!userId) {
          this.showMessage('用户ID不存在', 'error');
          return;
        }

        const url = `http://localhost:3001/api/dev/usage/${action}`;
        const data = { userId, ...params };

        const response = await new Promise((resolve, reject) => {
          wx.request({
            url,
            method: 'POST',
            data,
            success: (res) => {
              if (res.statusCode === 200 && res.data.success) {
                resolve(res.data);
              } else {
                reject(new Error(res.data?.message || '请求失败'));
              }
            },
            fail: (err) => reject(err)
          });
        });

        this.showMessage(
          `✅ ${response.message}\n新次数: ${response.data.newCount || response.data.count}`,
          'success'
        );

        // 更新父组件
        this.triggerEvent('update', {
          usageCount: response.data.newCount || response.data.count
        });

        // 清空输入框
        this.setData({ inputValue: '' });
      } catch (error) {
        console.error('开发者API调用失败:', error);
        this.showMessage(`❌ ${error.message}`, 'error');
      } finally {
        this.setData({ loading: false });
      }
    },

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
      this.setData({
        message,
        messageType: type
      });

      // 3秒后自动隐藏
      setTimeout(() => {
        this.setData({
          message: ''
        });
      }, 3000);
    }
  }
});
