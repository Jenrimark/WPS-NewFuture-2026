import { App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import type { Course } from '../lib/types';

interface PageData { list: Course[]; total: number; }

export default function CoursesPage() {
  const { message } = App.useApp();
  const [list, setList] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    const data = await request<PageData>('/courses', { params: { page, pageSize, keyword, status, category, sortField, sortOrder } });
    setList(data.list);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, pageSize, keyword, status, category, sortField, sortOrder]);
  useEffect(() => { request<string[]>('/courses/categories').then(setCategories); }, []);

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (editing) await request(`/courses/${editing.id}`, { method: 'PUT', data: values });
    else await request('/courses', { method: 'POST', data: values });
    setOpen(false);
    message.success('操作成功');
    fetchData();
  };

  const columns: ColumnsType<Course> = [
    { title: '课程名', dataIndex: 'name' },
    { title: '讲师', dataIndex: 'instructor' },
    { title: '分类', dataIndex: 'category' },
    { title: '选课人数', dataIndex: 'student_count', sorter: true },
    { title: '课时', dataIndex: 'lesson_count' },
    { title: '状态', dataIndex: 'status', render: (_, row) => (
      <Switch checked={row.status === 'published'} checkedChildren='已发布' unCheckedChildren='草稿'
        onChange={async () => { await request(`/courses/${row.id}/status`, { method: 'PATCH' }); fetchData(); }}
      />
    ) },
    {
      title: '操作',
      render: (_, row) => (
        <Space>
          <Button size='small' onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true); }}>编辑</Button>
          <Popconfirm title='确认删除课程吗？' onConfirm={async () => { await request(`/courses/${row.id}`, { method: 'DELETE' }); fetchData(); }}>
            <Button danger size='small'>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className='page-grid'>
      <Typography.Title level={3}>知识乐高墙</Typography.Title>
      <Card className='clay-card'>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder='课程名/讲师' allowClear onSearch={(v) => { setPage(1); setKeyword(v); }} />
          <Select placeholder='状态' allowClear style={{ width: 140 }} onChange={(v) => { setPage(1); setStatus(v || ''); }} options={[{ value: 'published', label: '已发布' }, { value: 'draft', label: '草稿' }]} />
          <Select placeholder='分类' allowClear style={{ width: 160 }} onChange={(v) => { setPage(1); setCategory(v || ''); }} options={categories.map((c) => ({ value: c, label: c }))} />
          <Button type='primary' className='melon-btn' onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增课程</Button>
        </Space>
        <Table
          rowKey='id'
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => <span className='table-total-count'>共 {t} 门课程</span>,
            className: 'clay-data-table-pagination',
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
          onChange={(_, __, sorter) => {
            if (!Array.isArray(sorter)) {
              setSortField((sorter.field as string) || '');
              setSortOrder(sorter.order || '');
            }
          }}
        />
        <Modal open={open} title={editing ? '编辑课程' : '新增课程'} onOk={onSubmit} onCancel={() => setOpen(false)} destroyOnClose>
          <Form form={form} layout='vertical' initialValues={{ status: 'draft', lesson_count: 8 }}>
            <Form.Item label='课程名称' name='name' rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label='讲师' name='instructor'><Input /></Form.Item>
            <Form.Item label='分类' name='category'><Input /></Form.Item>
            <Form.Item label='描述' name='description'><Input.TextArea rows={3} /></Form.Item>
            <Form.Item label='课时' name='lesson_count'><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label='状态' name='status'><Select options={[{ value: 'published', label: '已发布' }, { value: 'draft', label: '草稿' }]} /></Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
