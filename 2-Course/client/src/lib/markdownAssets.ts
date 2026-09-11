import { defaultUrlTransform } from 'react-markdown';

/** Markdown 里相对路径图片映射到后端静态接口（见 API /api/static） */
export function resolveMarkdownImageSrc(src: string | undefined): string | undefined {
  if (!src) return src;
  const s = src.trim();
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s) || s.startsWith('//') || s.startsWith('data:')) return s;
  if (s.startsWith('/api/static/')) return s;
  const path = s.replace(/^\.\//, '');
  if (path.startsWith('/')) return `/api/static${path}`;
  return `/api/static/${path}`;
}

/** 从 hast / props 里取出图片地址（可能是 string 或 string[]） */
export function pickMarkdownImageUrl(src: unknown, node?: unknown): string {
  if (typeof src === 'string' && src.trim()) return src.trim();
  const el = node as { properties?: Record<string, unknown> } | undefined;
  const p = el?.properties?.src;
  if (typeof p === 'string' && p.trim()) return p.trim();
  if (Array.isArray(p) && typeof p[0] === 'string') return p[0];
  return '';
}

/** 最终写入 <img src>：必须是站点根路径，避免在 /summary 等路由下相对路径变成 /summary/assets/… 拿到 HTML 裂图 */
export function normalizeMarkdownImageSrc(src: string): string {
  let t = (src || '').trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t) || t.startsWith('data:')) return t;
  if (t.startsWith('/api/static/')) return t;
  // 已错误解析成 /任意路由/assets/xxx → 拉回 data/assets
  const nested = t.match(/\/assets\/([^?#]+)/);
  if (nested && !t.startsWith('/api/')) {
    const rest = nested[1];
    return `/api/static/assets/${rest}`;
  }
  if (t.startsWith('/assets/')) {
    return `/api/static${t}`;
  }
  return resolveMarkdownImageSrc(t) ?? t;
}

/** 交给 ReactMarkdown：在生成 DOM 前改写 img 的 src，链接仍走默认安全策略 */
export function markdownUrlTransform(
  url: string,
  key: string,
  node: Readonly<{ tagName: string }>
): string {
  const tag = String(node?.tagName || '').toLowerCase();
  const k = String(key || '').toLowerCase();
  if (tag === 'img' && k === 'src') {
    const resolved = resolveMarkdownImageSrc(url.trim());
    return resolved ?? defaultUrlTransform(url);
  }
  return defaultUrlTransform(url);
}
