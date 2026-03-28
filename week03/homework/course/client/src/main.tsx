import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <div className="edu-platform min-h-screen">
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#22c55e',
          colorInfo: '#add8e6',
          colorSuccess: '#22c55e',
          colorWarning: '#fdbcb4',
          colorError: '#ef4444',
          colorBgLayout: '#fff9f5',
          colorBgContainer: '#ffffff',
          colorText: '#2d3748',
          colorTextSecondary: '#64748b',
          colorBorder: '#e2e8f0',
          borderRadius: 14,
          fontFamily: 'Nunito, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Card: {
            headerFontSize: 18,
            headerFontSizeSM: 16,
          },
          Layout: {
            bodyBg: '#fff9f5',
          },
          Table: {
            headerBg: '#fff9f5',
            headerColor: '#2d3748',
            borderColor: '#e2e8f0',
          },
          Modal: {
            borderRadiusLG: 20,
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </div>
);
