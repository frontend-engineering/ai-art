/**
 * 四角背景组件
 * 将背景图片分成四个角固定在页面四角，中间用渐变色填充
 * 背景色从顶部 rgb(180, 56, 45) 渐变到底部 rgb(159, 40, 38)
 * 
 * 注意：此组件为纯装饰层，使用 fixed 定位，不占用布局空间
 */
Component({
  properties: {
    // 是否显示中心渐变叠加层
    showOverlay: {
      type: Boolean,
      value: true
    }
  },
  
  data: {},
  
  methods: {}
});
