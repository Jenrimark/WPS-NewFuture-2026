import axios from 'axios';
import type { ApiResp } from './types';

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err.response?.status === 401) {
      const path = err.config?.url ?? '';
      // 登录失败也是 401，需把错误交给登录页展示，不能吞掉或整页跳转
      if (!path.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return new Promise(() => {});
      }
    }
    return Promise.reject(err);
  }
);

export async function request<T>(url: string, options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; params?: unknown; data?: unknown; }): Promise<T> {
  const resp = await instance.request<ApiResp<T>>({
    url,
    method: options?.method || 'GET',
    params: options?.params,
    data: options?.data,
  });

  if (resp.data.code !== 0) {
    throw new Error(resp.data.msg || '请求失败');
  }

  return resp.data.data;
}
