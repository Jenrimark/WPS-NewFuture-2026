# Week05 Docker + Gin 全栈作业

> 项目名称：英语单词学习助手（前后端分离）  
> 项目目标：完成一个可登录、可查词、可手动保存、可分页管理词本的全栈应用，并通过 Docker Compose 完成数据库 + 后端 + 前端统一编排部署。

---

## 项目基本信息

| 字段 | 内容 |
|---|---|
| 姓名 | 吴汉东 |
| 学校 | 中国地质大学（武汉） |
| 学号 | 20231003912 |
| 作业目录 | `week05/homework/docker-gin` |
| 后端 | Go 1.21+、Gin、GORM、JWT、Viper |
| 前端 | Vite（Vanilla JS） |
| 数据库 | MySQL 8.0 |
| 生产入口 | Nginx（唯一对外入口） |

---

## 开发任务索引（要求对照）

| 任务 | 目标 | 实现位置 | 状态 |
|---|---|---|---|
| 用户注册 | 用户名密码注册，密码必须哈希存储 | `backend/pkg/handlers/auth.go` | ✅ |
| 用户登录 | 校验账号密码并签发 JWT | `backend/pkg/handlers/auth.go` | ✅ |
| JWT 鉴权 | 受保护接口必须校验 Bearer Token | `backend/pkg/middleware/jwt.go` | ✅ |
| 智能查词 | 查 DB 命中则返回，否则调 AI，不自动落库 | `backend/pkg/handlers/words.go` | ✅ |
| 手动保存单词 | 前端确认后提交保存，绑定 UserID | `backend/pkg/handlers/words.go` | ✅ |
| 单词分页列表 | 支持 `page`、`page_size` | `backend/pkg/handlers/words.go` | ✅ |
| 删除单词 | 按 ID 软删除 | `backend/pkg/handlers/words.go` | ✅ |
| 跨域规范 | 开发走 Vite Proxy，生产走 Nginx 反代，后端禁 CORS | `frontend/vite.config.js`、`frontend/nginx.conf` | ✅ |
| 数据库初始化 | 禁止 AutoMigrate，使用 SQL 初始化 | `docs/init.sql`、`docker-compose.yml` | ✅ |
| 文档输出 | API 文档 + DB 文档 + 总体 README | `docs/api.md`、`docs/db.md`、`README.md` | ✅ |

---

## 项目简介与架构说明

本项目为“登录后查词”的学习型应用，核心链路如下：

1. 用户注册/登录，登录成功后拿到 JWT。
2. 前端后续请求自动携带 `Authorization: Bearer <token>`。
3. 查询单词时后端先查当前用户词本：
   - 若已存在，直接返回数据库结果；
   - 若不存在，调用 AI（`deepseek` 或 `qwen`）生成释义+3条例句，返回前端展示。
4. 用户点击“保存到单词本”后才写入 MySQL（不自动保存）。
5. 词本列表支持分页，删除采用软删除。

### 运行架构

- `frontend`：Nginx 提供前端静态页面，并将 `/api/` 请求反向代理到 `backend`。
- `backend`：Gin 提供业务接口，内部访问 `db`。
- `db`：MySQL 8.0，容器首次启动自动执行 `docs/init.sql`。

### 跨域策略（重点）

- 开发环境：前端通过 Vite `proxy` 代理 `/api` 到后端。
- 生产环境：浏览器只访问 Nginx（同源），Nginx 反代 `/api` 到后端。
- 后端：不添加任何 CORS 中间件。

---

## 目录结构说明

```text
week05/homework/docker-gin
├── backend/                 # Go 后端
│   ├── Dockerfile
│   ├── main.go
│   ├── .env                 # 示例配置
│   └── pkg/
│       ├── ai/              # AI Provider 调用
│       ├── config/          # Viper 配置加载
│       ├── db/              # MySQL 连接
│       ├── handlers/        # 业务接口
│       ├── middleware/      # JWT 鉴权
│       └── models/          # 数据模型
├── frontend/                # Vite 前端 + Nginx 配置
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   └── src/
├── docs/
│   ├── api.md               # API 详细文档
│   ├── db.md                # 数据库设计文档
│   └── init.sql             # 建表 SQL（容器初始化执行）
├── docker-compose.yml
└── README.md
```

---

## 环境变量与密钥配置（单独放在 `backend/.env`）

> 按你的要求：所有密钥和后端配置统一写在 `backend/.env`，不再散落在 `docker-compose.yml`。  
> 已提供模板：`backend/.env.example`。

### 第一步：准备 env 文件

在项目根目录执行：

```bash
cp backend/.env.example backend/.env
```

### 第二步：编辑 `backend/.env`

必须重点填写以下字段：

| 变量名 | 作用 | 必填 |
|---|---|---|
| `JWT_SECRET` | JWT 签名密钥 | 是 |
| `MYSQL_DSN` | 后端连接 MySQL 的 DSN | 是 |
| `DEEPSEEK_API_KEY` | DeepSeek Key | 二选一 |
| `QWEN_API_KEY` | 通义千问 Key | 二选一 |

其余变量说明：

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `APP_PORT` | `8080` | 后端监听端口 |
| `GIN_MODE` | `release` | Gin 运行模式 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek 接口基地址 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | DeepSeek 模型 |
| `QWEN_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 通义兼容接口地址 |
| `QWEN_MODEL` | `qwen-plus` | 通义模型 |

---

## 项目启动教程（开发模式）

> 适合边写代码边调试，前后端分别启动。

### 1) 启动数据库（Docker）

```bash
docker-compose up -d db
```

确认数据库启动正常：

```bash
docker-compose logs -f db
```

### 2) 启动后端（本地 Go）

```bash
cd backend
go run main.go
```

后端默认监听 `http://localhost:8080`（由 `APP_PORT` 决定）。

### 3) 启动前端（本地 Vite）

```bash
cd frontend
npm install
npm run dev
```

前端默认监听 `http://localhost:5173`，并通过 `vite.config.js` 将 `/api` 代理到 `http://localhost:8080`。

### 4) 开发模式访问地址

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:8080/api/...`

---

## Docker 部署教程（生产同源模式）

> 适合作业演示和最终验收，三服务一次拉起。

### 1) 检查 env 是否已配置

必须确认 `backend/.env` 已存在且至少填了一个 AI Key（`DEEPSEEK_API_KEY` 或 `QWEN_API_KEY`）。

### 2) 一键构建并启动

在目录 `week05/homework/docker-gin` 执行：

```bash
docker-compose up -d --build
```

### 3) 查看容器状态

```bash
docker-compose ps
```

### 4) 查看日志定位问题

```bash
docker-compose logs -f db
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5) Docker 模式访问地址

- 前端页面（Nginx 统一入口）：`http://localhost/`
- 后端 API（同源代理）：`http://localhost/api/...`

例如：

```text
POST http://localhost/api/login
GET  http://localhost/api/words?page=1&page_size=10
```

### 6) 使用流程（验收路径）

1. 注册账号；
2. 登录拿到 token（前端自动存到 `localStorage`）；
3. 选择 `deepseek` 或 `qwen` 查询单词；
4. 点击“保存到单词本”；
5. 分页查看并删除单词（软删除）。

---

## 接口速查（详细见 docs）

| 功能 | 方法 | 路径 | 鉴权 |
|---|---|---|---|
| 注册 | `POST` | `/api/register` | 否 |
| 登录 | `POST` | `/api/login` | 否 |
| 智能查词 | `GET` | `/api/words/query` | 是 |
| 手动保存单词 | `POST` | `/api/words` | 是 |
| 分页查询单词 | `GET` | `/api/words` | 是 |
| 删除单词（软删） | `DELETE` | `/api/words/:id` | 是 |

---

## 数据库设计速查（详细见 docs）

### `users`

- 用户基础信息表；
- 密码字段为 `password_hash`（bcrypt 后存储）；
- `username` 唯一约束。

### `words`

- 用户词本表；
- 与 `users.id` 外键关联；
- `(user_id, word)` 唯一约束，避免重复保存；
- `deleted_at` 实现软删除。

---

## 验收与自测清单

### 业务自测

- [ ] 注册成功，数据库 `users` 生成记录；
- [ ] `password_hash` 非明文；
- [ ] 登录返回 JWT；
- [ ] 未登录访问受保护接口返回 `UNAUTHORIZED`；
- [ ] 查词命中 DB 时 `source=db`；
- [ ] 首次查词未命中时 `source=ai` 且不自动落库；
- [ ] 手动保存后词本可分页查询；
- [ ] 删除后不再出现在列表（软删除）。

### 工程自测

- [ ] `docker-compose up -d --build` 可完整拉起服务；
- [ ] MySQL 首次启动自动执行 `docs/init.sql`；
- [ ] 浏览器只访问 Nginx 端口（`80`）即可完成所有功能；
- [ ] 后端代码中无 CORS 中间件实现；
- [ ] 文档 `docs/api.md`、`docs/db.md` 完整可读。

---

## 常见问题与排障

### 1) 查词返回 `AI_ERROR`

原因通常是 API Key 未配置、配置错误或 Provider 不可用。  
请优先检查 `docker-compose.yml` 中 `backend.environment` 的 AI Key。

### 2) 登录成功但后续接口仍 401

确认请求头是否携带：

```text
Authorization: Bearer <token>
```

并检查是否误删了浏览器 `localStorage` 中的 token。

### 3) 数据库没有自动建表

确认 `docker-compose.yml` 已挂载：

- `./docs/init.sql:/docker-entrypoint-initdb.d/init.sql:ro`

并注意：MySQL 仅在数据目录首次初始化时自动执行脚本；若已有旧数据卷，需重建卷后再初始化。

### 4) 页面能打开但 API 报错

确认 Nginx 反代规则生效（`frontend/nginx.conf`），并检查 `backend` 容器是否健康运行。

---

## 文档索引

- API 文档：`docs/api.md`
- 数据库设计：`docs/db.md`
- 初始化 SQL：`docs/init.sql`

---

## 其他说明（希望老师看到）

- 本项目严格遵循“后端不配 CORS”的跨域规范，通过 Vite Proxy（开发）与 Nginx 反代（生产）分别解决跨域问题。
- 数据库初始化采用 `init.sql`，避免 `AutoMigrate` 带来的结构不可控风险，更贴近企业开发流程（DBA 审计与建表可追溯）。
- 业务流程采用“先查后存、手动确认保存”的学习场景设计，减少误入库并提升用户可控性。
