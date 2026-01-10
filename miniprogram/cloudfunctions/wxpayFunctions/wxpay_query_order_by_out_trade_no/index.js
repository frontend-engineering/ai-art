/**
 * 微信支付 - 根据商户订单号查询订单
 * 
 * 接收参数:
 * - out_trade_no: 商户订单号
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
  const { out_trade_no } = event;
  
  // 验证参数
  if (!out_trade_no) {
    return {
      code: -1,
      msg: '缺少商户订单号参数'
    };
  }
  
  try {
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: {
        name: 'wxpay_query_order_by_out_trade_no',
        data: {
          out_trade_no
        },
      },
    });
    
    // 格式化返回结果
    if (res.result) {
      return {
        code: 0,
        msg: 'success',
        data: {
          out_trade_no: res.result.out_trade_no,
          transaction_id: res.result.transaction_id,
          trade_state: res.result.trade_state,
          trade_state_desc: res.result.trade_state_desc,
          amount: res.result.amount,
          payer: res.result.payer,
          success_time: res.result.success_time
        }
      };
    }
    
    return res.result;
  } catch (error) {
    console.error('查询订单失败:', error);
    return {
      code: -1,
      msg: error.message || '查询订单失败'
    };
  }
};