-- 添加 trade_type 字段到 payment_orders 表
-- 用于区分不同的支付场景：JSAPI（小程序）、NATIVE（PC扫码）等

ALTER TABLE payment_orders 
ADD COLUMN trade_type VARCHAR(20) DEFAULT 'JSAPI' COMMENT '支付类型: JSAPI-小程序, NATIVE-扫码支付, H5-H5支付, APP-APP支付'
AFTER payment_method;

-- 添加索引
ALTER TABLE payment_orders ADD INDEX idx_trade_type (trade_type);
