import {
  BookOutlined,
  DashboardOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  ReadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Layout, Menu, Space, Typography, type MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: 'dashboard', path: '/', label: '工作台', icon: <DashboardOutlined /> },
  { key: 'courses', path: '/courses', label: '课程管理', icon: <BookOutlined /> },
  { key: 'students', path: '/students', label: '学生管理', icon: <TeamOutlined /> },
  { key: 'summary', path: '/summary', label: '学习总结', icon: <ProfileOutlined /> },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [collapsed, setCollapsed] = useState(false);
  const [persona, setPersona] = useState(() => user.name || '管理员');

  const selected = useMemo(() => {
    if (location.pathname.startsWith('/courses')) return ['courses'];
    if (location.pathname.startsWith('/students')) return ['students'];
    if (location.pathname.startsWith('/summary')) return ['summary'];
    return ['dashboard'];
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: '切换分身',
    },
    {
      key: 'persona-admin',
      label: '管理员',
      onClick: () => setPersona('管理员'),
    },
    {
      key: 'persona-teacher',
      label: '演示教师',
      onClick: () => setPersona('演示教师'),
    },
    {
      key: 'persona-student',
      label: '演示学员',
      onClick: () => setPersona('演示学员'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        className="clay-sider"
        width={240}
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        theme="light"
      >
        <div className="clay-sider-brand">
          <div className="clay-logo-mark clay-sider-logo">
            <ReadOutlined />
          </div>
          {!collapsed ? (
            <Typography.Title level={5} className="clay-sider-title">
              学习管理平台
            </Typography.Title>
          ) : null}
        </div>
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={selected}
          onClick={({ key }) => navigate(key === 'dashboard' ? '/' : `/${key}`)}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          className="clay-sider-menu"
        />
      </Sider>
      <Layout>
        <Header className="clay-header">
          <button
            type="button"
            className="clay-header-trigger"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <div className="clay-header-spacer" />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <button type="button" className="clay-header-user">
              <Space size={10}>
                <Avatar
                  size={36}
                  icon={<UserOutlined />}
                  className="clay-header-avatar"
                  style={{ background: 'var(--secondary)', color: 'var(--text)' }}
                />
                <span className="clay-header-user-name">{persona}</span>
                <DownOutlined className="clay-header-user-caret" />
              </Space>
            </button>
          </Dropdown>
        </Header>
        <Content className="clay-layout-content">
          <div className="edu-content">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
