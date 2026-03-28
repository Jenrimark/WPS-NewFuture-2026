import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { request } from '../lib/api';
import type { UserInfo } from '../lib/types';

interface LoginResp {
  token: string;
  user: UserInfo;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const data = await request<LoginResp>('/auth/login', { method: 'POST', data: values });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      message.success('登录成功，欢迎来到学习乐园');
      navigate('/');
    } catch (error) {
      message.error((error as Error).message || '登录失败');
    }
  };

  return (
    <div className='login-wrap'>
      <Card className='clay-card login-card'>
        <Typography.Title level={2}>开启快乐之门</Typography.Title>
        <Typography.Paragraph type='secondary'>测试账号：admin / admin123</Typography.Paragraph>
        <Form layout='vertical' onFinish={onFinish} initialValues={{ username: 'admin', password: 'admin123' }}>
          <Form.Item label='用户名' name='username' rules={[{ required: true }]}>
            <Input size='large' prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item label='密码' name='password' rules={[{ required: true }]}>
            <Input.Password size='large' prefix={<LockOutlined />} />
          </Form.Item>
          <Button className='melon-btn' htmlType='submit' type='primary' size='large' block>登录</Button>
        </Form>
      </Card>
    </div>
  );
}
