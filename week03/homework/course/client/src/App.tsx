import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import CoursesPage from './pages/CoursesPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import StudentsPage from './pages/StudentsPage';
import SummaryPage from './pages/SummaryPage';

function hasAuthToken() {
  const t = localStorage.getItem('token');
  return Boolean(t && t.trim());
}

/** 未登录不可访问；已登录才渲染子路由 */
function RequireAuth({ children }: { children: ReactElement }) {
  return hasAuthToken() ? children : <Navigate to='/login' replace />;
}

/** 仅未登录可访问登录页；已登录则去首页 */
function GuestOnly({ children }: { children: ReactElement }) {
  return hasAuthToken() ? <Navigate to='/' replace /> : children;
}

/** 未匹配路径：未登录 → 登录页；已登录 → 工作台 */
function UnknownRouteRedirect() {
  return <Navigate to={hasAuthToken() ? '/' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path='/login'
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path='/'
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path='courses' element={<CoursesPage />} />
        <Route path='students' element={<StudentsPage />} />
        <Route path='summary' element={<SummaryPage />} />
      </Route>
      <Route path='*' element={<UnknownRouteRedirect />} />
    </Routes>
  );
}
