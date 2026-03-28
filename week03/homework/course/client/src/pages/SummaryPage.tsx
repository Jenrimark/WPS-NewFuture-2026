import { Card, Typography } from 'antd';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { request } from '../lib/api';

export default function SummaryPage() {
  const [content, setContent] = useState('');
  useEffect(() => { request<{ content: string }>('/summary').then((d) => setContent(d.content)); }, []);

  return (
    <div className='page-grid'>
      <Typography.Title level={3}>我的光荣榜</Typography.Title>
      <Card className='clay-card markdown-body'>
        <ReactMarkdown
          components={{
            img: ({ ...props }) => <img {...props} style={{ maxWidth: 280, borderRadius: 16, boxShadow: '0 10px 30px rgba(49,46,129,0.2)' }} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </Card>
    </div>
  );
}
