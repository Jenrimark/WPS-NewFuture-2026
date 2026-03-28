import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { request } from '../lib/api';

interface DashboardData {
  stats: { totalCourses: number; publishedCourses: number; totalStudents: number; activeStudents: number; };
  charts: {
    enrollment: Array<{ name: string; value: number }>;
    activity: Array<{ label: string; students: number; duration: number }>;
    statusDist: Array<{ name: string; value: number }>;
    categoryDist: Array<{ name: string; value: number }>;
  };
}

const COLORS = ['#fdbcb4', '#add8e6', '#22c55e', '#98ff98', '#e6e6fa'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    request<DashboardData>('/dashboard').then(setData);
  }, []);

  if (!data) return <Card loading className='clay-card' />;

  return (
    <div className='page-grid'>
      <Typography.Title level={3}>我的学习乐园</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}><Card className='clay-card'><Statistic title='课程总数' value={data.stats.totalCourses} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className='clay-card'><Statistic title='学生总数' value={data.stats.totalStudents} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className='clay-card'><Statistic title='发布率' value={Math.round((data.stats.publishedCourses / Math.max(data.stats.totalCourses, 1)) * 100)} suffix='%' /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className='clay-card'><Statistic title='活跃率' value={Math.round((data.stats.activeStudents / Math.max(data.stats.totalStudents, 1)) * 100)} suffix='%' /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className='clay-card' title='课程选课人数排行'>
            <ResponsiveContainer width='100%' height={280}>
              <BarChart data={data.charts.enrollment}>
                <CartesianGrid strokeDasharray='4 4' />
                <XAxis dataKey='name' hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey='value' fill='#69b1ff' radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className='clay-card' title='近7天学习活跃度'>
            <ResponsiveContainer width='100%' height={280}>
              <LineChart data={data.charts.activity}>
                <CartesianGrid strokeDasharray='4 4' />
                <XAxis dataKey='label' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type='monotone' dataKey='students' stroke='#ff7875' strokeWidth={3} />
                <Line type='monotone' dataKey='duration' stroke='#ffd666' strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className='clay-card' title='学生状态分布'>
            <ResponsiveContainer width='100%' height={280}>
              <PieChart>
                <Pie data={data.charts.statusDist} dataKey='value' nameKey='name' outerRadius={96} label>
                  {data.charts.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className='clay-card' title='课程分类分布'>
            <ResponsiveContainer width='100%' height={280}>
              <PieChart>
                <Pie data={data.charts.categoryDist} dataKey='value' nameKey='name' outerRadius={96} label>
                  {data.charts.categoryDist.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
