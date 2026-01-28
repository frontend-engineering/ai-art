/**
 * Property-Based Testing Generators
 * 用于生成测试数据的生成器函数
 */
const fc = require('fast-check');
const { v4: uuidv4 } = require('uuid');

/**
 * 生成用户数据
 */
const userArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  nickname: fc.string({ minLength: 1, maxLength: 50 }),
  wechat_openid: fc.string({ minLength: 28, maxLength: 28 }),
  payment_status: fc.constantFrom('free', 'basic', 'premium'),
  created_at: fc.date({ min: new Date('2024-01-01'), max: new Date() })
});

/**
 * 生成订单数据
 */
const orderArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  user_id: fc.constant(uuidv4()),
  type: fc.constantFrom('payment', 'product'),
  package_type: fc.constantFrom('basic', 'premium'),
  amount: fc.double({ min: 0.01, max: 9999.99, noNaN: true }),
  status: fc.constantFrom('pending', 'paid', 'refunded', 'failed'),
  created_at: fc.date({ min: new Date('2024-01-01'), max: new Date() })
});

/**
 * 生成价格配置数据
 */
const priceConfigArbitrary = () => fc.record({
  category: fc.constantFrom('package', 'product', 'service'),
  code: fc.string({ minLength: 5, maxLength: 30 }).map(s => {
    const cleaned = s.replace(/[^a-z0-9_]/gi, '_');
    // Append timestamp to ensure uniqueness across test runs
    return `${cleaned}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  price: fc.double({ min: 0, max: 9999.99, noNaN: true }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  effective_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  status: fc.constantFrom('active', 'inactive', 'scheduled'),
  created_by: fc.constant(null) // Set to null to avoid foreign key issues
}).map(data => ({
  id: uuidv4(), // Generate fresh UUID for each test
  ...data
}));

/**
 * 生成价格历史数据
 */
const priceHistoryArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  price_config_id: fc.constant(uuidv4()),
  old_price: fc.option(fc.double({ min: 0, max: 9999.99, noNaN: true }), { nil: null }),
  new_price: fc.double({ min: 0, max: 9999.99, noNaN: true }),
  changed_by: fc.constant(uuidv4()),
  change_reason: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  changed_at: fc.date({ min: new Date('2024-01-01'), max: new Date() })
});

/**
 * 生成管理员用户数据
 */
const adminUserArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  username: fc.string({ minLength: 3, maxLength: 20 }).map(s => s.replace(/[^a-z0-9_]/gi, '_')),
  role: fc.constantFrom('super_admin', 'operator', 'support'),
  email: fc.emailAddress(),
  status: fc.constantFrom('active', 'locked', 'disabled')
});

/**
 * 生成操作日志数据
 */
const operationLogArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  admin_user_id: fc.constant(uuidv4()),
  operation_type: fc.constantFrom('create', 'update', 'delete', 'query'),
  operation_module: fc.constantFrom('user', 'order', 'price', 'config'),
  operation_desc: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  request_method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  request_url: fc.webUrl(),
  ip_address: fc.ipV4(),
  status: fc.constantFrom('success', 'failed'),
  created_at: fc.date({ min: new Date('2024-01-01'), max: new Date() })
});

/**
 * 生成模板配置数据
 */
const templateConfigArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  mode: fc.constantFrom('transform', 'puzzle'),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  image_url: fc.webUrl(),
  thumbnail_url: fc.option(fc.webUrl(), { nil: null }),
  sort_order: fc.integer({ min: 0, max: 1000 }),
  status: fc.constantFrom('active', 'inactive'),
  usage_count: fc.integer({ min: 0, max: 100000 })
});

/**
 * 生成生成历史数据
 */
const generationArbitrary = () => fc.record({
  id: fc.constant(uuidv4()),
  user_id: fc.constant(uuidv4()),
  mode: fc.constantFrom('transform', 'puzzle'),
  template_id: fc.constant(uuidv4()),
  status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
  result_url: fc.option(fc.webUrl(), { nil: null }),
  error_message: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  created_at: fc.date({ min: new Date('2024-01-01'), max: new Date() })
});

module.exports = {
  userArbitrary,
  orderArbitrary,
  priceConfigArbitrary,
  priceHistoryArbitrary,
  adminUserArbitrary,
  operationLogArbitrary,
  templateConfigArbitrary,
  generationArbitrary
};
