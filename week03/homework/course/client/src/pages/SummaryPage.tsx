import { App, Button, Card, Input, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { MarkdownCodeBlock } from '../components/MarkdownCodeBlock';
import { request } from '../lib/api';
import { markdownUrlTransform, normalizeMarkdownImageSrc, pickMarkdownImageUrl } from '../lib/markdownAssets';

export default function SummaryPage() {
  const { message } = App.useApp();
  const [content, setContent] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<{ content: string }>('/summary').then((d) => {
      setContent(d.content);
      setDraft(d.content);
    });
  }, []);

  const markdownComponents: Components = {
    img: ({ src, alt, node, className, style, width, height, loading, decoding, referrerPolicy, sizes, srcSet, useMap }) => {
      const raw = pickMarkdownImageUrl(src, node);
      const finalSrc = normalizeMarkdownImageSrc(raw);
      return (
        <img
          src={finalSrc}
          alt={typeof alt === 'string' ? alt : ''}
          className={className}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(49,46,129,0.2)',
            ...(style && typeof style === 'object' ? style : {}),
          }}
          width={width}
          height={height}
          loading={loading ?? 'lazy'}
          decoding={decoding ?? 'async'}
          referrerPolicy={referrerPolicy}
          sizes={sizes}
          srcSet={srcSet}
          useMap={useMap}
        />
      );
    },
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children, ...props }) => {
      const raw = String(children).replace(/\n$/, '');
      const match = /language-(\w+)/.exec(className || '');
      const isBlock = Boolean(match) || raw.includes('\n');
      if (isBlock) {
        const lang = match?.[1] ?? 'text';
        return <MarkdownCodeBlock language={lang} code={raw} />;
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await request<{ content: string }>('/summary', { method: 'PUT', data: { content: draft } });
      setContent(draft);
      setEditing(false);
      message.success('学习总结已保存');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='page-grid'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>我的光荣榜</Typography.Title>
        <Space>
          {!editing ? (
            <Button type='primary' onClick={() => { setDraft(content); setEditing(true); }}>
              编辑总结
            </Button>
          ) : (
            <>
              <Button type='primary' loading={saving} onClick={onSave}>保存</Button>
              <Button onClick={() => { setDraft(content); setEditing(false); }}>取消</Button>
            </>
          )}
        </Space>
      </div>
      <Card className='clay-card markdown-body'>
        {editing ? (
          <Input.TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoSize={{ minRows: 16, maxRows: 30 }}
            placeholder='请输入 Markdown 学习总结'
          />
        ) : (
          <ReactMarkdown urlTransform={markdownUrlTransform} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        )}
      </Card>
    </div>
  );
}
