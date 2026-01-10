/**
 * 微信支付 - 下单
 * 
 * 接收参数:
 * - packageType: 套餐类型 ('basic' | 'premium')
 * - generationId: 关联的生成任务ID
 * - userId: 用户ID
 * - description: 商品描述 (可选，会自动生成)
 * - amount: 金额(分) (可选，根据套餐自动计算)
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 套餐配置
const PACKAGES = {
  basic: {
    name: '9.9元尝鲜包',
    amount: 990,  // 分
    description: 'AI全家福-尝鲜包'
  },
  premium: {
    name: '29.9元尊享包',
    amount: 2990,  // 分
    description: 'AI全家福-尊享包'
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  
  // 获取参数
  const { packageType, generationId, userId, description, amount } = event;
  
  // 验证套餐类型
  const packageConfig = PACKAGES[packageType];
  if (!packageConfig && !amount) {
    return {
      code: -1,
      msg: '无效的套餐类型或未指定金额'
    };
  }
  
  // 确定金额和描述
  const orderAmount = amount || packageConfig.amount;
  const orderDescription = description || packageConfig.description;
  
  // 生成商户订单号: 时间戳 + 随机数
  const outTradeNo = `${Date.now()}${Math.round(Math.random() * 10000)}`;
  
  try {
    // 存储订单到数据库
    const orderData = {
      outTradeNo,
      packageType,
      generationId,
      userId,
      openid: wxContext.OPENID,
      amount: orderAmount,
      description: orderDescription,
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    };
    
    await db.collection('orders').add({ data: orderData });
    
    // 调用微信支付下单
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: {
        name: 'wxpay_order',
        data: {
          description: orderDescription,
          amount: {
            total: orderAmount,
            currency: 'CNY',
          },
          out_trade_no: outTradeNo,
          payer: {
            openid: wxContext.OPENID,
          },
        },
      },
    });
    
    // 返回支付凭证
    if (res.result && res.result.payment) {
      return {
        code: 0,
        msg: 'success',
        data: {
          timeStamp: res.result.payment.timeStamp,
          nonceStr: res.result.payment.nonceStr,
          packageVal: res.result.payment.package,
          paySign: res.result.payment.paySign,
          outTradeNo
        }
      };
    }
    
    return res.result;
  } catch (error) {
    console.error('创建订单失败:', error);
    return {
      code: -1,
      msg: error.message || '创建订单失败'
    };
  }
};