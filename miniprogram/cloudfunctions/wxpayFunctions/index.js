const makeOrder = require('./wxpay_order/index');
const queryOrderByOutTradeNo = require('./wxpay_query_order_by_out_trade_no/index');
const queryOrderByTransactionId = require('./wxpay_query_order_by_transaction_id/index');
const refund = require('./wxpay_refund/index');
const refundQuery = require('./wxpay_refund_query/index');
const orderCallback = require('./wxpay_order_callback/index');
const refundCallback = require('./wxpay_refund_callback/index');

// 云函数入口函数
exports.main = async (event, context) => {
    // 检查是否是 HTTP 触发器调用（微信支付回调）
    if (event.headers && event.httpMethod) {
        console.log('[wxpayFunctions] HTTP 触发器调用，路径:', event.path);
        
        // 微信支付回调
        if (event.path === '/pay' || event.path === '/pay/callback' || event.httpMethod === 'POST') {
            console.log('[wxpayFunctions] 处理微信支付回调');
            
            // 解析请求体
            let body = event.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('[wxpayFunctions] 解析请求体失败:', e);
                }
            }
            
            // 构造回调事件参数
            const callbackEvent = {
                ...body,
                headers: event.headers,
                signature: event.headers['wechatpay-signature'] || event.headers['Wechatpay-Signature'],
                timestamp: event.headers['wechatpay-timestamp'] || event.headers['Wechatpay-Timestamp'],
                nonce: event.headers['wechatpay-nonce'] || event.headers['Wechatpay-Nonce'],
                serial: event.headers['wechatpay-serial'] || event.headers['Wechatpay-Serial']
            };
            
            const result = await orderCallback.main(callbackEvent, context);
            
            // 返回 HTTP 响应格式
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result)
            };
        }
    }
    
    // 云函数调用（非 HTTP 触发器）
    switch (event.type) {
        case 'wxpay_order':
            return await makeOrder.main(event, context);
        case 'wxpay_query_order_by_out_trade_no':
            return await queryOrderByOutTradeNo.main(event, context);
        case 'wxpay_query_order_by_transaction_id':
            return await queryOrderByTransactionId.main(event, context);
        case 'wxpay_refund':
            return await refund.main(event, context);
        case 'wxpay_refund_query':
            return await refundQuery.main(event, context);
        case 'wxpay_order_callback':
            return await orderCallback.main(event, context);
        case 'wxpay_refund_callback':
            return await refundCallback.main(event, context);
        default:
            return {
                code: -1,
                msg: 'Unimplemented method'
            };
    }
};

