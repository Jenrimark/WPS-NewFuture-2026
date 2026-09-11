import { CopyOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = {
  language: string;
  code: string;
};

export function MarkdownCodeBlock({ language, code }: Props) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      message.success('已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div className='markdown-code-block'>
      <Button
        type='text'
        size='small'
        className='markdown-code-block__copy'
        icon={<CopyOutlined />}
        onClick={onCopy}
      >
        {copied ? '已复制' : '复制'}
      </Button>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        PreTag='pre'
        customStyle={{
          margin: 0,
          borderRadius: 12,
          padding: '40px 16px 16px',
          fontSize: 13,
          background: '#fff9f5',
          border: '1px solid var(--border)',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            background: 'transparent',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
