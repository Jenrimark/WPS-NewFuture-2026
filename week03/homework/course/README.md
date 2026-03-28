# 在线学习管理平台 — README（提交说明）

本文档面向批改老师，说明本项目与《作业 2 要求》的对应关系、如何本地运行体验，以及技术实现要点。

---

## 项目基本信息

| 项目 | 内容 |
|------|------|
| 姓名 | 吴汉东 |
| 学校 | 中国地质大学（武汉） |
| 学号 | 20231003912 |

---

## 开发任务索引

对照作业文档「二、功能需求」与「三、技术要求」，下列条目均已落实，说明如下。

**登录认证**  
用户名与密码登录，请求 `/api/auth/login`；未登录访问业务路由会跳转登录页。测试账号为 `admin` / `admin123`。

**工作台**  
四个统计卡片（课程总数、学生总数、发布率、活跃率；前两卡带「/ 已发布 n」「/ 活跃 n」副提示）；柱状图（选课人数排行）、折线图（近 7 天学习人数与学习时长）、饼图（学生状态分布）、饼图（课程分类分布）。

**课程管理**  
分页（默认每页 10 条，可改每页条数）、课程名与讲师搜索、状态与分类筛选、**选课人数列由服务端排序**、新增/编辑/删除（删除有气泡确认）、发布与草稿切换。

**学生管理**  
分页、姓名与学号搜索、班级与状态筛选、新增/编辑/删除（删除有确认）、**支持多选课程**。

**学习总结**  
从服务端读取 Markdown（`server/data/summary.md`），在前端解析并渲染。

**前端技术栈**  
Vite、React、TypeScript、Ant Design、Recharts；**未使用** UmiJS、飞冰、Ant Design Pro 等集成脚手架。

**后端技术栈**  
Node.js、Koa、`@koa/router`、`better-sqlite3`、`jsonwebtoken`（及 `bcryptjs` 等）。

**开发与生产**  
开发时前端端口 `5173`，Vite 将 `/api` 代理到 `3000`；生产环境由 Koa 托管 `client/dist`，浏览器访问 `http://localhost:3000` 即可。

**附加说明**  
界面采用黏土风（Claymorphism）全局样式；课程与学生列表分页栏右侧展示「共 n 门课程 / 共 n 人」。

---

## 核心技术实现

**前端**  
路由使用 `react-router-dom`，通过 `RequireAuth` / `GuestOnly` 控制登录态。请求封装在 `lib/api` 中，请求头携带 JWT，并统一处理错误与 401。工作台图表用 Recharts，学习总结用 `react-markdown`。作业要求里提到的 **Tailwind CSS** 本项目**未引入**；布局与黏土风视觉集中在 `client/src/index.css`（用 CSS 变量与 BEM 式类名承担类似实用类的分工），避免与 Ant Design 主题叠床架屋。若需与文档字面完全一致，可再集成 Tailwind；当前实现已满足功能与界面要求。

**后端**  
SQLite 持久化用户、课程、学生及选课关系；课程列表支持 `sortField` / `sortOrder` 服务端排序（含 `student_count`）。Dashboard 提供聚合统计与四类图表所需数据；学习总结由 `/api/summary` 读出静态文件后交给前端渲染。

**部署与静态资源**  
`server/src/index.js` 在 `GET` 非 `/api` 路径时从 `client/dist` 提供静态文件，并对 SPA 回退到 `index.html`。

---

## 老师本地体验步骤（与作业批改一致）

在仓库中依次执行：

```bash
cd week03/homework/course/client && npm i && npm run build
cd ../server && npm i && npm start
```

完成后在浏览器打开 **http://localhost:3000**（使用的是打包后的前端）。

---

## 提交与视频（按作业「五、作业提交」）

**代码与构建产物**  
作业要求提交 **`client/dist`**。提交前请在 `client` 目录执行 `npm run build`，并确保仓库里包含最新构建结果。

**演示视频**  
按作业要求的命名与路径放置（例如 `姓名_学号_在线学习管理平台.mp4`），内容与口播以作业说明为准；视频文件路径不写入本 README 正文。

**学习总结正文**  
可在 `server/data/summary.md` 中按个人真实学习经历持续修改。

---

## 其他说明

本项目位于课程作业仓库子目录 `week03/homework/course`，内含 `client` 与 `server` 两个子工程。若批改时只看源码、未先构建，也可在 `client` 下执行 `npm run dev`（需同时启动 `server`），通过 **http://localhost:5173** 访问，此时依赖 Vite 将 `/api` 代理到后端。
