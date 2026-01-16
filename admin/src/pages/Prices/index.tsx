/**
 * 价格配置管理页面
 */

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, Switch, message, Space, Tag, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, HistoryOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { 
  getAllPrices, 
  getCurrentPrices, 
  createPrice, 
  updatePrice, 
  deactivatePrice,
  getPriceHistoryByPackage,
  type PriceConfig,
  type PriceHistory 
} from '../../services/price';

const { Option } = Select;

const PACKAGE_TYPE_MAP: Record<string, string> = {
  free: '免费版',
  basic: '尝鲜包',
  premium: '尊享包'
};

const PricesPage: React.FC = () => {
  const [prices, setPrices] = useState<PriceConfig[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceConfig | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPrices();
    loadCurrentPrices();
  }, []);

  const loadPrices = async () => {
    setLoading(true);
    try {
      const data = await getAllPrices();
      setPrices(data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载价格配置失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPrices = async () => {
    try {
      const data = await getCurrentPrices();
      setCurrentPrices(data);
    } catch (error: any) {
      message.error('加载当前价格失败');
    }
  };

  const handleCreate = () => {
    setEditingPrice(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: PriceConfig) => {
    setEditingPrice(record);
    form.setFieldsValue({
      packageType: record.package_type,
      price: record.price,
      effectiveDate: dayjs(record.effective_date),
      isActive: record.is_active
    });
    setModalVisible(true);
  };

  const handleViewHistory = async (packageType: string) => {
    try {
      const history = await getPriceHistoryByPackage(packageType);
      setPriceHistory(history);
      setHistoryModalVisible(true);
    } catch (error: any) {
      message.error('加载价格历史失败');
    }
  };

  const handleDeactivate = async (id: number) => {
    Modal.confirm({
      title: '确认停用',
      content: '确定要停用此价格配置吗？',
      onOk: async () => {
        try {
          await deactivatePrice(id);
          message.success('停用成功');
          loadPrices();
          loadCurrentPrices();
        } catch (error: any) {
          message.error(error.response?.data?.message || '停用失败');
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        packageType: values.packageType,
        price: values.price,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD HH:mm:ss'),
        isActive: values.isActive
      };

      if (editingPrice) {
        await updatePrice(editingPrice.id, data);
        message.success('更新成功');
      } else {
        await createPrice(data);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadPrices();
      loadCurrentPrices();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns: ColumnsType<PriceConfig> = [
    {
      title: '套餐类型',
      dataIndex: 'package_type',
      key: 'package_type',
      render: (type: string) => PACKAGE_TYPE_MAP[type] || type
    },
    {
      title: '价格（元）',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: '生效时间',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '停用'}
        </Tag>
      )
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      key: 'created_by'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            icon={<HistoryOutlined />} 
            onClick={() => handleViewHistory(record.package_type)}
          >
            历史
          </Button>
          {record.is_active && (
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeactivate(record.id)}
            >
              停用
            </Button>
          )}
        </Space>
      )
    }
  ];

  const historyColumns: ColumnsType<PriceHistory> = [
    {
      title: '变更时间',
      dataIndex: 'changed_at',
      key: 'changed_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '原价格',
      dataIndex: 'old_price',
      key: 'old_price',
      render: (price: number | null) => price !== null ? `¥${price.toFixed(2)}` : '-'
    },
    {
      title: '新价格',
      dataIndex: 'new_price',
      key: 'new_price',
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: '变更人',
      dataIndex: 'changed_by',
      key: 'changed_by'
    },
    {
      title: '变更原因',
      dataIndex: 'reason',
      key: 'reason'
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic 
                title="免费版当前价格" 
                value={currentPrices.free || 0} 
                prefix="¥" 
                precision={2}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="尝鲜包当前价格" 
                value={currentPrices.basic || 0} 
                prefix="¥" 
                precision={2}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="尊享包当前价格" 
                value={currentPrices.premium || 0} 
                prefix="¥" 
                precision={2}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建价格配置
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={prices}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingPrice ? '编辑价格配置' : '新建价格配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="packageType"
            label="套餐类型"
            rules={[{ required: true, message: '请选择套餐类型' }]}
          >
            <Select placeholder="请选择套餐类型" disabled={!!editingPrice}>
              <Option value="free">免费版</Option>
              <Option value="basic">尝鲜包</Option>
              <Option value="premium">尊享包</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="price"
            label="价格（元）"
            rules={[
              { required: true, message: '请输入价格' },
              { type: 'number', min: 0, message: '价格不能为负数' }
            ]}
          >
            <Input type="number" placeholder="请输入价格" step="0.01" />
          </Form.Item>

          <Form.Item
            name="effectiveDate"
            label="生效时间"
            rules={[{ required: true, message: '请选择生效时间' }]}
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm:ss" 
              style={{ width: '100%' }}
              placeholder="请选择生效时间"
            />
          </Form.Item>

          {editingPrice && (
            <Form.Item
              name="isActive"
              label="启用状态"
              valuePropName="checked"
            >
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="价格变更历史"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={historyColumns}
          dataSource={priceHistory}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};

export default PricesPage;
