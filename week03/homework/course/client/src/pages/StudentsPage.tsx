import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import type { Course, Student } from '../lib/types';

interface PageData { list: Student[]; total: number; }

export default function StudentsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [list, setList] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [className, setClassName] = useState('');
  const [status, setStatus] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const data = await request<PageData>('/students', { params: { page, pageSize, keyword, className, status } });
    setList(data.list);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, pageSize, keyword, className, status]);
  useEffect(() => { request<string[]>('/students/classes').then(setClasses); }, []);
  useEffect(() => { request<{ list: Course[] }>('/courses', { params: { page: 1, pageSize: 200 } }).then((d) => setCourses(d.list)); }, []);

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (editing) await request(`/students/${editing.id}`, { method: 'PUT', data: values });
    else await request('/students', { method: 'POST', data: values });
    setOpen(false);
    message.success('操作成功');
    fetchData();
  };

  const columns: ColumnsType<Student> = [
    { title: '姓名', dataIndex: 'name' },
    { title: '学号', dataIndex: 'student_no' },
    { title: '班级', dataIndex: 'class_name' },
    { title: '联系方式', dataIndex: 'phone' },
    { title: '状态', dataIndex: 'status', render: (v) => (v === 'active' ? '活跃' : '非活跃') },
    { title: '选课数', dataIndex: 'course_ids', render: (ids: number[]) => ids?.length || 0 },
    { title: '操作', render: (_, row) => (
      <Space>
        <Button size='small' onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true); }}>编辑</Button>
        <Popconfirm title='确认删除该学生吗？' onConfirm={async () => { await request(`/students/${row.id}`, { method: 'DELETE' }); fetchData(); }}>
          <Button danger size='small'>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div className='page-grid'>
      <Typography.Title level={3}>友谊点名册</Typography.Title>
      <Card className='clay-card'>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder='姓名/学号' allowClear onSearch={(v) => { setPage(1); setKeyword(v); }} />
          <Select placeholder='班级' allowClear style={{ width: 180 }} onChange={(v) => { setPage(1); setClassName(v || ''); }} options={classes.map((c) => ({ value: c, label: c }))} />
          <Select placeholder='状态' allowClear style={{ width: 140 }} onChange={(v) => { setPage(1); setStatus(v || ''); }} options={[{ value: 'active', label: '活跃' }, { value: 'inactive', label: '非活跃' }]} />
          <Button type='primary' className='melon-btn' onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增学生</Button>
        </Space>
        <Table
          rowKey='id'
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
        />
        <Modal open={open} title={editing ? '编辑学生' : '新增学生'} onOk={onSubmit} onCancel={() => setOpen(false)} destroyOnClose>
          <Form form={form} layout='vertical' initialValues={{ status: 'active', course_ids: [] }}>
            <Form.Item label='姓名' name='name' rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label='学号' name='student_no' rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label='班级' name='class_name'><Input /></Form.Item>
            <Form.Item label='手机号' name='phone'><Input /></Form.Item>
            <Form.Item label='邮箱' name='email'><Input /></Form.Item>
            <Form.Item label='状态' name='status'><Select options={[{ value: 'active', label: '活跃' }, { value: 'inactive', label: '非活跃' }]} /></Form.Item>
            <Form.Item label='课程' name='course_ids'><Select mode='multiple' options={courses.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
