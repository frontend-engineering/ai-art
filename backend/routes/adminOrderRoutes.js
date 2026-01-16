const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/adminAuth');
const { logOperation } = require('../middleware/adminLogger');
const db = require('../db/connection');

// 获取订单列表（支付订单 + 产品订单）
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      orderType, // 'payment' | 'product' | 'all'
      status,
      userId,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);

    // 构建查询条件
    let whereConditions = [];
    let params = [];

    if (userId) {
      whereConditions.push('user_id = ?');
      params.push(userId);
    }

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 根据订单类型查询
    let orders = [];
    let total = 0;

    if (!orderType || orderType === 'all') {
      // 查询支付订单
      const paymentQuery = `
        SELECT 
          po.id,
          po.user_id,
          po.generation_id,
          po.amount,
          po.package_type,
          po.payment_method,
          po.trade_type,
          po.transaction_id,
          po.status,
          po.created_at,
          po.updated_at,
          'payment' as order_type
        FROM payment_orders po
        ${whereClause}
      `;

      // 查询产品订单
      const productQuery = `
        SELECT 
          po.id,
          po.user_id,
          po.generation_id,
          po.product_type,
          po.product_price as amount,
          po.shipping_name,
          po.shipping_phone,
          po.shipping_address,
          po.status,
          po.created_at,
          po.updated_at,
          'product' as order_type
        FROM product_orders po
        ${whereClause}
      `;

      const connection = await db.pool.getConnection();
      try {
        const [paymentOrders] = await connection.query(paymentQuery, params);
        const [productOrders] = await connection.query(productQuery, params);

        orders = [...paymentOrders, ...productOrders];
        
        // 排序
        orders.sort((a, b) => {
          if (sortOrder === 'DESC') {
            return new Date(b[sortBy]) - new Date(a[sortBy]);
          }
          return new Date(a[sortBy]) - new Date(b[sortBy]);
        });

        total = orders.length;
        orders = orders.slice(offset, offset + limit);
      } finally {
        connection.release();
      }

    } else if (orderType === 'payment') {
      const query = `
        SELECT 
          po.id,
          po.user_id,
          po.generation_id,
          po.amount,
          po.package_type,
          po.payment_method,
          po.trade_type,
          po.transaction_id,
          po.status,
          po.created_at,
          po.updated_at,
          'payment' as order_type
        FROM payment_orders po
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const countQuery = `SELECT COUNT(*) as total FROM payment_orders ${whereClause}`;
      
      const connection = await db.pool.getConnection();
      try {
        const [rows] = await connection.query(query, [...params, limit, offset]);
        const [countResult] = await connection.query(countQuery, params);
        
        orders = rows;
        total = countResult[0].total;
      } finally {
        connection.release();
      }

    } else if (orderType === 'product') {
      const query = `
        SELECT 
          po.id,
          po.user_id,
          po.generation_id,
          po.product_type,
          po.product_price as amount,
          po.shipping_name,
          po.shipping_phone,
          po.shipping_address,
          po.status,
          po.created_at,
          po.updated_at,
          'product' as order_type
        FROM product_orders po
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const countQuery = `SELECT COUNT(*) as total FROM product_orders ${whereClause}`;
      
      const connection = await db.pool.getConnection();
      try {
        const [rows] = await connection.query(query, [...params, limit, offset]);
        const [countResult] = await connection.query(countQuery, params);
        
        orders = rows;
        total = countResult[0].total;
      } finally {
        connection.release();
      }
    }

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败',
      error: error.message
    });
  }
});

// 获取订单详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { orderType } = req.query; // 'payment' | 'product'

    let order = null;
    const connection = await db.pool.getConnection();

    try {
      if (!orderType || orderType === 'payment') {
        // 尝试从支付订单表查询
        const [paymentOrders] = await connection.execute(
          `SELECT 
            po.*,
            'payment' as order_type
          FROM payment_orders po
          WHERE po.id = ?`,
          [id]
        );

        if (paymentOrders.length > 0) {
          order = paymentOrders[0];
        }
      }

      if (!order && (!orderType || orderType === 'product')) {
        // 尝试从产品订单表查询
        const [productOrders] = await connection.execute(
          `SELECT 
            po.*,
            'product' as order_type
          FROM product_orders po
          WHERE po.id = ?`,
          [id]
        );

        if (productOrders.length > 0) {
          order = productOrders[0];
        }
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      // 获取关联的生成记录
      if (order.generation_id) {
        const [generations] = await connection.execute(
          `SELECT * FROM generation_history WHERE id = ?`,
          [order.generation_id]
        );
        if (generations.length > 0) {
          order.generation = generations[0];
        }
      }

      res.json({
        success: true,
        data: order
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败',
      error: error.message
    });
  }
});

// 更新订单状态
router.put('/:id/status', authenticate, authorize('super_admin', 'admin'), logOperation, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, orderType } = req.body;

    if (!status || !orderType) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    let tableName = orderType === 'payment' ? 'payment_orders' : 'product_orders';
    
    // 验证状态值
    const validStatuses = {
      payment: ['pending', 'paid', 'failed', 'refunded'],
      product: ['pending', 'paid', 'exported', 'shipped', 'delivered', 'cancelled']
    };

    if (!validStatuses[orderType].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的订单状态'
      });
    }

    const connection = await db.pool.getConnection();
    try {
      const [result] = await connection.execute(
        `UPDATE ${tableName} SET status = ?, updated_at = NOW() WHERE id = ?`,
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      res.json({
        success: true,
        message: '订单状态更新成功'
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新订单状态失败',
      error: error.message
    });
  }
});

// 订单退款
router.post('/:id/refund', authenticate, authorize('super_admin'), logOperation, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const connection = await db.pool.getConnection();
    try {
      // 查询支付订单
      const [orders] = await connection.execute(
        `SELECT * FROM payment_orders WHERE id = ? AND status = 'paid'`,
        [id]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: '订单不存在或状态不允许退款'
        });
      }

      const order = orders[0];

      // TODO: 调用微信支付退款API
      // 这里暂时只更新数据库状态
      
      const [result] = await connection.execute(
        `UPDATE payment_orders SET status = 'refunded', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      res.json({
        success: true,
        message: '退款成功',
        data: {
          orderId: id,
          amount: order.amount,
          reason
        }
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('订单退款失败:', error);
    res.status(500).json({
      success: false,
      message: '订单退款失败',
      error: error.message
    });
  }
});

// 导出订单数据
router.get('/export/data', authenticate, async (req, res) => {
  try {
    const { orderType = 'all', startDate, endDate } = req.query;

    let whereConditions = [];
    let params = [];

    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let csvData = '';
    const connection = await db.pool.getConnection();

    try {
      if (orderType === 'payment' || orderType === 'all') {
        const [paymentOrders] = await connection.query(
          `SELECT * FROM payment_orders ${whereClause} ORDER BY created_at DESC`,
          params
        );

        if (paymentOrders.length > 0) {
          csvData += '支付订单\n';
          csvData += 'ID,用户ID,金额,套餐类型,支付方式,交易类型,交易ID,状态,创建时间\n';
          
          paymentOrders.forEach(order => {
            csvData += `${order.id},${order.user_id},${order.amount},${order.package_type},${order.payment_method},${order.trade_type},${order.transaction_id || ''},${order.status},${order.created_at}\n`;
          });
          
          csvData += '\n';
        }
      }

      if (orderType === 'product' || orderType === 'all') {
        const [productOrders] = await connection.query(
          `SELECT * FROM product_orders ${whereClause} ORDER BY created_at DESC`,
          params
        );

        if (productOrders.length > 0) {
          csvData += '产品订单\n';
          csvData += 'ID,用户ID,产品类型,价格,收货人,电话,地址,状态,创建时间\n';
          
          productOrders.forEach(order => {
            csvData += `${order.id},${order.user_id},${order.product_type},${order.product_price},${order.shipping_name},${order.shipping_phone},"${order.shipping_address}",${order.status},${order.created_at}\n`;
          });
        }
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=orders_${Date.now()}.csv`);
      res.send('\ufeff' + csvData); // 添加BOM以支持Excel打开中文
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('导出订单数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出订单数据失败',
      error: error.message
    });
  }
});

// 获取订单统计
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereConditions = [];
    let params = [];

    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const connection = await db.pool.getConnection();
    try {
      // 支付订单统计
      const [paymentStats] = await connection.query(
        `SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_amount,
          AVG(CASE WHEN status = 'paid' THEN amount ELSE NULL END) as avg_amount
        FROM payment_orders ${whereClause}`,
        params
      );

      // 产品订单统计
      const [productStats] = await connection.query(
        `SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status IN ('paid', 'exported', 'shipped', 'delivered') THEN 1 ELSE 0 END) as paid_count,
          SUM(CASE WHEN status IN ('paid', 'exported', 'shipped', 'delivered') THEN product_price ELSE 0 END) as total_amount
        FROM product_orders ${whereClause}`,
        params
      );

      // 按日期统计
      const [dailyStats] = await connection.query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(amount) as daily_amount
        FROM payment_orders
        ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30`,
        params
      );

      res.json({
        success: true,
        data: {
          payment: paymentStats[0],
          product: productStats[0],
          daily: dailyStats
        }
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单统计失败',
      error: error.message
    });
  }
});

module.exports = router;
