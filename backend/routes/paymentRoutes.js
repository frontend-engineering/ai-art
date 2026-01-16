/**
 * 支付相关路由模块
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const userService = require('../services/userService');
const { 
  isWechatPaymentAvailable, createJsapiPayment, createNativePayment,
  verifyCallbackSign, decipherCallback 
} = require('../services/wechatPayService');
const { executeWithRetry } = require('../utils/apiRetry');
const { validateRequest, validateCreatePaymentParams, validateWechatPaymentParams } = require('../utils/validation');
const errorLogService = require('../services/errorLogService');

// 套餐价格配置
const PACKAGE_PRICES = { 'free': 0, 'basic': 0.01, 'premium': 29.9 };

// 创建支付订单
router.post('/create', validateRequest(validateCreatePaymentParams), async (req, res) => {
  try {
    const { userId, generationId, packageType } = req.body;
    
    if (!userId || !generationId || !packageType) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        message: '需要提供 userId, generationId 和 packageType 参数' 
      });
    }
    
    const validPackageTypes = ['free', 'basic', 'premium'];
    if (!validPackageTypes.includes(packageType)) {
      return res.status(400).json({ 
        error: '无效的套餐类型', 
        message: '套餐类型必须是 free, basic 或 premium' 
      });
    }
    
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在', message: '未找到对应的用户' });
    }
    
    const orderId = uuidv4();
    const amount = PACKAGE_PRICES[packageType];
    
    const connection = await db.pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO payment_orders 
        (id, user_id, generation_id, amount, package_type, payment_method, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [orderId, userId, generationId, amount, packageType, 'wechat', 'pending']
      );
      
      console.log(`创建支付订单成功: ${orderId}, 用户: ${userId}, 金额: ${amount}`);
      
      res.json({ 
        success: true, 
        data: { orderId, amount, packageType, status: 'pending' }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建支付订单失败:', error);
    await errorLogService.logError('PAYMENT_ORDER_CREATE_FAILED', error.message, {
      userId: req.body.userId, packageType: req.body.packageType
    });
    res.status(500).json({ error: '创建支付订单失败', message: error.message });
  }
});

// 发起微信支付
router.post('/wechat/jsapi', validateRequest(validateWechatPaymentParams), async (req, res) => {
  try {
    const { orderId, openid } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 orderId 参数' });
    }
    
    if (!isWechatPaymentAvailable()) {
      return res.status(503).json({ error: '支付服务不可用', message: '微信支付配置未完整设置' });
    }
    
    const connection = await db.pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM payment_orders WHERE id = ?', [orderId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '订单不存在', message: '未找到对应的支付订单' });
      }
      
      const order = rows[0];
      
      if (order.status !== 'pending') {
        return res.status(400).json({ 
          error: '订单状态异常', 
          message: `订单状态为 ${order.status}，无法支付` 
        });
      }
      
      const params = {
        description: `AI全家福-${order.package_type === 'basic' ? '尝鲜包' : '尊享包'}`,
        out_trade_no: orderId,
        notify_url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payment/callback`,
        amount: { total: Math.round(order.amount * 100), currency: 'CNY' },
        payer: { openid: openid || 'test_openid' }
      };
      
      const result = await executeWithRetry(
        () => createJsapiPayment(params),
        { maxRetries: 1, timeout: 30000, operationName: '微信支付JSAPI' }
      );
      
      res.json({ success: true, data: result });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('发起微信支付失败:', error);
    await errorLogService.logError('WECHAT_PAYMENT_FAILED', error.message, { orderId: req.body.orderId });
    res.status(500).json({ error: '发起微信支付失败', message: error.message });
  }
});

// 发起 Native 支付（PC扫码支付）
router.post('/wechat/native', async (req, res) => {
  try {
    const { orderId, packageType, userId, generationId, description, amount } = req.body;
    
    if (!isWechatPaymentAvailable()) {
      return res.status(503).json({ error: '支付服务不可用', message: '微信支付配置未完整设置' });
    }
    
    const connection = await db.pool.getConnection();
    try {
      let order;
      let finalOrderId = orderId;
      
      // 如果提供了 orderId，查询现有订单
      if (orderId) {
        const [rows] = await connection.execute('SELECT * FROM payment_orders WHERE id = ?', [orderId]);
        
        if (rows.length === 0) {
          return res.status(404).json({ error: '订单不存在', message: '未找到对应的支付订单' });
        }
        
        order = rows[0];
        
        if (order.status !== 'pending') {
          return res.status(400).json({ 
            error: '订单状态异常', 
            message: `订单状态为 ${order.status}，无法支付` 
          });
        }
      } else {
        // 没有 orderId，创建新订单
        if (!packageType) {
          return res.status(400).json({ error: '缺少必要参数', message: '需要提供 orderId 或 packageType' });
        }
        
        const validPackageTypes = ['basic', 'premium'];
        if (!validPackageTypes.includes(packageType)) {
          return res.status(400).json({ error: '无效的套餐类型' });
        }
        
        finalOrderId = uuidv4();
        const orderAmount = amount || PACKAGE_PRICES[packageType];
        
        await connection.execute(
          `INSERT INTO payment_orders 
          (id, user_id, generation_id, amount, package_type, payment_method, trade_type, status, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [finalOrderId, userId || null, generationId || null, orderAmount, packageType, 'wechat', 'NATIVE', 'pending']
        );
        
        order = {
          id: finalOrderId,
          amount: orderAmount,
          package_type: packageType
        };
        
        console.log(`创建 Native 支付订单: ${finalOrderId}`);
      }
      
      const params = {
        description: description || `AI全家福-${order.package_type === 'basic' ? '尝鲜包' : '尊享包'}`,
        out_trade_no: finalOrderId,
        notify_url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payment/callback`,
        amount: { total: Math.round(order.amount * 100), currency: 'CNY' }
      };
      
      const result = await executeWithRetry(
        () => createNativePayment(params),
        { maxRetries: 1, timeout: 30000, operationName: '微信支付Native' }
      );
      
      // 更新订单的 trade_type
      await connection.execute(
        'UPDATE payment_orders SET trade_type = ? WHERE id = ?',
        ['NATIVE', finalOrderId]
      );
      
      res.json({ 
        success: true, 
        data: {
          orderId: finalOrderId,
          codeUrl: result.code_url,
          amount: order.amount,
          packageType: order.package_type
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('发起 Native 支付失败:', error);
    await errorLogService.logError('WECHAT_NATIVE_PAYMENT_FAILED', error.message, { 
      orderId: req.body.orderId,
      packageType: req.body.packageType 
    });
    res.status(500).json({ error: '发起 Native 支付失败', message: error.message });
  }
});

// 微信支付回调
router.post('/callback', async (req, res) => {
  try {
    console.log('收到微信支付回调');
    
    if (!isWechatPaymentAvailable()) {
      return res.status(503).json({ code: 'FAIL', message: '支付服务不可用' });
    }
    
    const signature = req.headers['wechatpay-signature'];
    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];
    const serial = req.headers['wechatpay-serial'];
    const body = req.body;
    
    let isValid = false;
    try {
      isValid = await verifyCallbackSign({ signature, timestamp, nonce, body: JSON.stringify(body), serial });
    } catch (verifyError) {
      console.error('签名验证失败:', verifyError);
      return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });
    }
    
    if (!isValid) {
      return res.status(401).json({ code: 'FAIL', message: '签名验证不通过' });
    }
    
    let decryptedData;
    try {
      decryptedData = decipherCallback(
        body.resource.ciphertext, body.resource.associated_data, body.resource.nonce
      );
    } catch (decryptError) {
      console.error('解密回调数据失败:', decryptError);
      return res.status(500).json({ code: 'FAIL', message: '解密失败' });
    }
    
    if (body.event_type === 'TRANSACTION.SUCCESS') {
      const orderId = decryptedData.out_trade_no;
      const transactionId = decryptedData.transaction_id;
      const tradeState = decryptedData.trade_state;
      
      console.log(`订单 ${orderId} 支付成功，微信交易ID: ${transactionId}`);
      
      const connection = await db.pool.getConnection();
      try {
        await connection.beginTransaction();
        
        await connection.execute(
          `UPDATE payment_orders SET status = ?, transaction_id = ?, updated_at = NOW() WHERE id = ?`,
          [tradeState === 'SUCCESS' ? 'paid' : 'failed', transactionId, orderId]
        );
        
        if (tradeState === 'SUCCESS') {
          const [orderRows] = await connection.execute(
            'SELECT user_id, package_type FROM payment_orders WHERE id = ?', [orderId]
          );
          
          if (orderRows.length > 0) {
            const { user_id, package_type } = orderRows[0];
            await connection.execute(
              'UPDATE users SET payment_status = ?, updated_at = NOW() WHERE id = ?',
              [package_type, user_id]
            );
            console.log(`用户 ${user_id} 付费状态已更新为 ${package_type}`);
          }
        }
        
        await connection.commit();
      } catch (dbError) {
        await connection.rollback();
        console.error('更新订单状态失败:', dbError);
        return res.status(500).json({ code: 'FAIL', message: '数据库更新失败' });
      } finally {
        connection.release();
      }
    }
    
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理微信支付回调失败:', error);
    await errorLogService.logError('WECHAT_CALLBACK_FAILED', error.message, {
      headers: { signature: req.headers['wechatpay-signature'] }
    });
    res.status(500).json({ code: 'FAIL', message: error.message });
  }
});

// 查询支付订单状态
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const connection = await db.pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM payment_orders WHERE id = ?', [orderId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '订单不存在', message: '未找到对应的支付订单' });
      }
      
      const order = rows[0];
      res.json({ 
        success: true, 
        data: {
          orderId: order.id, userId: order.user_id, generationId: order.generation_id,
          amount: parseFloat(order.amount), packageType: order.package_type,
          paymentMethod: order.payment_method, transactionId: order.transaction_id,
          status: order.status, createdAt: order.created_at, updatedAt: order.updated_at
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('查询支付订单失败:', error);
    res.status(500).json({ error: '查询支付订单失败', message: error.message });
  }
});

// 更新支付订单状态
router.put('/order/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, transactionId } = req.body;
    
    if (!orderId || !status) {
      return res.status(400).json({ error: '缺少必要参数', message: '需要提供 orderId 和 status 参数' });
    }
    
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [orderRows] = await connection.execute(
        'SELECT user_id, package_type, status FROM payment_orders WHERE id = ?', [orderId]
      );
      
      if (orderRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: '订单不存在' });
      }
      
      const order = orderRows[0];
      
      if (transactionId) {
        await connection.execute(
          'UPDATE payment_orders SET status = ?, transaction_id = ?, updated_at = NOW() WHERE id = ?',
          [status, transactionId, orderId]
        );
      } else {
        await connection.execute(
          'UPDATE payment_orders SET status = ?, updated_at = NOW() WHERE id = ?',
          [status, orderId]
        );
      }
      
      if (status === 'paid' && order.status !== 'paid') {
        await connection.execute(
          'UPDATE users SET payment_status = ?, updated_at = NOW() WHERE id = ?',
          [order.package_type, order.user_id]
        );
      }
      
      await connection.commit();
      
      res.json({ 
        success: true, message: '订单状态更新成功',
        data: { orderId, status, userPaymentStatus: status === 'paid' ? order.package_type : null }
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新支付订单状态失败:', error);
    res.status(500).json({ error: '更新支付订单状态失败', message: error.message });
  }
});

// 重试支付订单
router.post('/order/:orderId/retry', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { openid } = req.body;
    
    const connection = await db.pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM payment_orders WHERE id = ?', [orderId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '订单不存在' });
      }
      
      const order = rows[0];
      
      if (order.status !== 'pending' && order.status !== 'failed') {
        return res.status(400).json({ error: '订单状态异常', message: `订单状态为 ${order.status}，无法重试` });
      }
      
      await connection.execute(
        'UPDATE payment_orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['pending', orderId]
      );
      
      if (!isWechatPaymentAvailable()) {
        return res.status(503).json({ error: '支付服务不可用' });
      }
      
      const params = {
        description: `AI全家福-${order.package_type === 'basic' ? '尝鲜包' : '尊享包'}`,
        out_trade_no: orderId,
        notify_url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payment/callback`,
        amount: { total: Math.round(order.amount * 100), currency: 'CNY' },
        payer: { openid: openid || 'test_openid' }
      };
      
      const result = await executeWithRetry(
        () => createJsapiPayment(params),
        { maxRetries: 1, timeout: 30000, operationName: '重试微信支付' }
      );
      
      res.json({ success: true, message: '重试支付成功', data: result });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('重试支付失败:', error);
    res.status(500).json({ error: '重试支付失败', message: error.message });
  }
});

module.exports = router;
