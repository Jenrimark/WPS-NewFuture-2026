# 项目基本信息

- 姓名：吴汉东
- 学校：中国地质大学（武汉）
- 学号：20231003912

# 开发任务索引

- [x] 登录认证（固定账号：admin / admin123）
- [x] 工作台统计卡片与 4 类图表
- [x] 课程管理（分页、搜索、筛选、排序、增删改、状态切换）
- [x] 学生管理（分页、搜索、筛选、增删改、多选课程）
- [x] 学习总结（服务端 Markdown 渲染）
- [x] 前后端联调（Vite 代理到 Koa）
- [x] 生产部署（Koa 托管 `client/dist`）
- [x] 黏土风（Claymorphism）界面风格落地

# 核心技术实现

1. **前端**
   - 基于 React + TypeScript + Vite + Ant Design + Recharts。
   - 使用 `react-router-dom` 实现登录路由守卫，未登录跳转登录页。
   - 封装统一 `api` 请求方法，注入 JWT token 并处理 401。

2. **后端**
   - 基于 Koa + @koa/router + better-sqlite3 + jsonwebtoken。
   - 通过 SQLite 建立用户、课程、学生、学生选课关联表，完成完整 CRUD。
   - 提供 dashboard、course、student、summary 等业务 API。

3. **部署**
   - 开发阶段前端端口 `5173`，通过 Vite 代理 `/api` 到 `3000`。
   - 生产阶段通过 Koa 静态托管 `client/dist`，访问 `http://localhost:3000` 即可打开项目。

# 其他说明

- 学习总结内容位于 `server/data/summary.md`，已替换为真实前端学习总结模板，可继续按个人经历修改。
- 如需提交作业，请确保执行过前端 `npm run build`，并保留 `client/dist` 目录。
