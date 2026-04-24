# week05 docker-gin 作业：英语单词学习助手

> 前后端分离 Web 应用：登录后可智能查询单词（AI 生成释义+3例句），并手动保存到个人单词本（MySQL 持久化，分页列表，软删除）。

## 1. 基本信息

- **姓名**：（请在此填写）
- **学校**：（请在此填写）
- **学号**：（请在此填写）

## 2. 完成任务清单

- Go + Gin 后端 API
- JWT 登录鉴权（`Authorization: Bearer <token>`）
- 密码 Hash 存储（bcrypt）
- MySQL 8.0 + GORM（**不使用 AutoMigrate**，通过 `docs/init.sql` 初始化）
- AI 对接（DeepSeek / 通义千问，OpenAI Compatible 模式）
- Viper 配置管理（支持读取 `backend/.env` 和环境变量）
- Vite 前端（开发环境使用 proxy 解决跨域）
- Nginx 生产环境反向代理（前端静态资源 + `/api` 转发后端，**同源**）
- Docker Compose 一键编排（仅暴露 Nginx 80 端口）
- 文档：`docs/api.md`、`docs/db.md`

## 3. 架构说明

- **frontend**：Vite 构建静态资源，生产镜像基于 `nginx:alpine`，作为唯一外部入口
- **backend**：Gin 提供 `/api` 接口，内部访问 MySQL
- **db**：MySQL 8.0，启动时自动执行 `docs/init.sql` 建表
- **跨域规范**：
  - 开发环境：前端通过 `vite.config.js` 的 proxy 访问 `/api`
  - 生产环境：通过 Nginx `proxy_pass` 实现同源访问；后端 **不允许**配置任何 CORS 中间件

## 4. 运行指南（从零启动）

### 4.1 前置依赖

- Docker Desktop（或 Docker Engine + Compose）

### 4.2 配置 AI Key（可选但建议）

后端支持两种 provider：`deepseek` / `qwen`。

你可以在 `docker-compose.yml` 的 `backend.environment` 里填写：

- `DEEPSEEK_API_KEY`（DeepSeek）
- `QWEN_API_KEY`（通义千问，DashScope OpenAI Compatible）

不配置 Key 时，调用 `/api/words/query` 会返回 `AI_ERROR`。

### 4.3 一键启动

在本目录执行：

```bash
docker-compose up -d --build
```

### 4.4 访问地址

- 前端页面：`http://localhost/`

### 4.5 使用流程

1. 注册并登录（Token 会存到浏览器 `localStorage`）
2. 选择 provider，输入单词并查询（不自动保存）
3. 点击“保存到单词本”
4. 在“我的单词本”中分页查看与删除（软删除）

## 5. 文档索引

- 接口文档：`docs/api.md`
- 数据库文档：`docs/db.md`
- 建表脚本：`docs/init.sql`
