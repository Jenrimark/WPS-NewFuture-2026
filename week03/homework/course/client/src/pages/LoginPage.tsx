import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { request } from '../lib/api';
import type { UserInfo } from '../lib/types';
import LoginVisualLeft from '../components/LoginVisualLeft';

interface LoginResp {
  token: string;
  user: UserInfo;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [form] = Form.useForm();
  const [isTyping, setIsTyping] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);

  // passwordLength 始终跟随输入内容（showPassword 只影响可见性与眼神偷瞄分支）。

  const onFinish = async (values: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const data = await request<LoginResp>('/auth/login', { method: 'POST', data: values });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      message.success('登录成功，欢迎来到学习乐园');
      navigate('/');
    } catch (error) {
      message.error((error as Error).message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='login-wrap'>
      <div className='course-login-shell'>
        <div className='course-login-left' aria-hidden='true'>
          <LoginVisualLeft isTyping={isTyping} showPassword={showPassword} passwordLength={passwordLength} />
        </div>

        <div className='course-login-right'>
          <Card className='clay-card course-login-card'>
            <Typography.Title level={2}>开启快乐之门</Typography.Title>
            <Typography.Paragraph type='secondary'>测试账号：admin / admin123</Typography.Paragraph>

            <Form
              form={form}
              layout='vertical'
              onFinish={onFinish}
              validateTrigger='onChange'
              initialValues={{ username: 'admin', password: '' }}
              className='course-login-form'
            >
              <Form.Item
                label='用户名'
                name='username'
                rules={[
                  { required: true, message: '请输入用户名' },
                  {
                    validator: (_, value) => {
                      const v = String(value ?? '').trim();
                      if (!v) return Promise.resolve();
                      if (v.length < 3) return Promise.reject(new Error('用户名至少 3 位'));
                      return Promise.resolve();
                    },
                  },
                ]}
                validateStatus={undefined}
              >
                <Input
                  size='large'
                  prefix={<UserOutlined />}
                  autoComplete='off'
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                />
              </Form.Item>

              <Form.Item
                label='密码'
                name='password'
                rules={[
                  { required: true, message: '请输入密码' },
                  {
                    validator: (_, value) => {
                      const v = String(value ?? '');
                      if (!v) return Promise.resolve();
                      if (v.length < 6) return Promise.reject(new Error('密码至少 6 位'));
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size='large'
                  type={showPassword ? 'text' : 'password'}
                  prefix={<LockOutlined />}
                  autoComplete='off'
                  onChange={(e) => {
                    setPasswordLength(e.target.value.length);
                  }}
                  suffix={
                    <button
                      type='button'
                      className='course-login-eye-btn'
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowPassword((prev) => !prev);
                      }}
                    >
                      {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </button>
                  }
                />
              </Form.Item>

              <Button
                className='melon-btn'
                htmlType='submit'
                type='primary'
                size='large'
                block
                disabled={isLoading}
              >
                {isLoading ? '登录中…' : '登录'}
              </Button>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
