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
import { Avatar, Dropdown, Layout, Menu, Space, type MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

/** 展开态宽度（px），须与 index.css 里 `.edu-platform { --clay-sider-expanded }` 的数值一致。 */
const SIDER_EXPANDED_WIDTH = 220;

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
  const displayName = (typeof user.name === 'string' && user.name.trim()) || '用户';

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
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  return (
    <Layout className="clay-app-shell">
      <Sider
        className={collapsed ? 'clay-sider clay-sider--compact' : 'clay-sider'}
        width={SIDER_EXPANDED_WIDTH}
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        theme="light"
      >
        <div className="clay-sider-brand">
          <div className={collapsed ? 'clay-sider-book-icon' : 'clay-logo-mark clay-sider-logo'}>
            <ReadOutlined />
          </div>
          {!collapsed ? <span className="clay-sider-title">学习管理平台</span> : null}
        </div>
        <div className="clay-sider-panel clay-slab">
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
        </div>
      </Sider>
      <Layout className="clay-app-main">
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
                <span className="clay-header-user-name">{displayName}</span>
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
