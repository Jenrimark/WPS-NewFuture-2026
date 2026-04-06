import Router from '@koa/router';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = new Router();
const mdPath = join(__dirname, '../../data/summary.md');

router.get('/', authenticateToken, async (ctx) => {
  try {
    const content = readFileSync(mdPath, 'utf-8');
    success(ctx, { content });
  } catch {
    fail(ctx, 500, '读取学习总结失败');
  }
});

router.put('/', authenticateToken, async (ctx) => {
  try {
    const { content } = ctx.request.body || {};
    if (typeof content !== 'string') {
      return fail(ctx, 400, '内容格式不正确');
    }

    writeFileSync(mdPath, content, 'utf-8');
    success(ctx, { content }, '保存成功');
  } catch {
    fail(ctx, 500, '保存学习总结失败');
  }
});

export default router;
