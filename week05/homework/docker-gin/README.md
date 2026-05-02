# Week05 Docker + Gin 全栈作业

> **英语单词学习助手**：前后端分离，登录后查词（大模型生成释义与 3 条例句），用户确认后写入个人词本；全栈 Docker Compose 部署，Nginx 为唯一对外入口。

---

## 安全与密钥（必读）

- **真实 API Key、JWT 密钥只写入本机 `backend/.env`**。仓库通过根目录 `.gitignore` 忽略 `.env`，**切勿**把含真实密钥的 `.env` 推送到 Git。
- **切勿**在 README、作业文档、聊天、截图中粘贴完整密钥。若密钥已出现在不可信渠道，请立刻在**阿里云 DashScope / 灵积**控制台**作废并轮换**。
- 仓库内仅保留 **`backend/.env.example`**（占位符）。你本地配置阿里云时，请使用 DashScope 控制台发放的 Key，并将兼容模式 Base URL 设为：

  `https://dashscope.aliyuncs.com/compatible-mode/v1`

  模型名以控制台为准（示例常用 `qwen-plus`）。

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
| 生产入口 | Nginx（**80** HTTP + **443** HTTPS，自签名证书） |

---

## 《要求.md》全文逐条核验

以下与教师下发的 `week05/homework/docker-gin/要求.md` **逐条对照**。结论列：**满足✅** / **说明**。

### 一、项目背景

| 要求摘要 | 核验证据 | 结论 |
|---|---|---|
| 英语学习 Web；查词 + AI 释义与 3 条例句；手动保存词本；考察分离架构、代理与跨域、AI、库表设计、Docker 部署 | 功能与文档覆盖全流程；见下文「项目简介」与 `docs/db.md` | **满足✅** |

### 二、技术栈与核心架构

| 要求摘要 | 核验证据 | 结论 |
|---|---|---|
| Go ≥1.21 + Gin | `backend/go.mod`、`main.go` | **满足✅** |
| 前端基于 Vite | `frontend/vite.config.js`、`package.json` | **满足✅** |
| MySQL 8 + GORM | `docker-compose.yml` 服务 `db: mysql:8.0`；业务 `gorm.io/gorm` | **满足✅** |
| Docker & Compose | 根目录 `docker-compose.yml` | **满足✅** |
| 前端生产 Nginx | `frontend/Dockerfile` 第二阶段 `nginx:alpine` | **满足✅** |
| JWT | `backend/api/middleware/jwt.go`、`service/auth.go` | **满足✅** |
| Viper | `backend/pkg/config/config.go` | **满足✅** |
| **禁止后端 CORS 中间件** | 全仓库检索：后端无 `cors` / `CORS` / `Access-Control` 配置；`main.go` 仅 `gin.Logger`、`Recovery` | **满足✅** |
| 开发：Vite `proxy` 解决跨域 | `frontend/vite.config.js` → `/api` → 本地后端 | **满足✅** |
| 生产：Nginx `proxy_pass` 同源 | `frontend/nginx.conf` → `upstream backend_api` → `backend:8080` | **满足✅** |

**仓库自检命令（可选）**：

```bash
cd week05/homework/docker-gin
rg -i "cors|Access-Control" backend/ --glob "*.go" || true
# 期望：无业务 CORS 中间件（无匹配或仅注释）
```

### 三、项目目录结构

| 要求路径/内容 | 本仓库对应 | 结论 |
|---|---|---|
| `backend/Dockerfile`、`main.go`、`.env`（示例） | `Dockerfile`、`main.go`、**`.env.example`**（复制为 `.env`；真实 `.env` 不入库） | **满足✅**（说明：作业允许示例 env；本仓库用 `.env.example` 更符合安全实践） |
| `api, service, model` 等分层 | `backend/api/`、`backend/service/`、`backend/model/`；支撑在 `backend/pkg/` | **满足✅** |
| `frontend/Dockerfile`、`nginx.conf`、`vite.config.js` | 均存在 | **满足✅** |
| `docs/api.md`、`docs/db.md`、`init.sql` | 均存在 | **满足✅** |
| `docker-compose.yml`、`README.md` | 均存在 | **满足✅** |

### 四、核心功能

| 要求摘要 | 核验证据 | 结论 |
|---|---|---|
| 注册；密码 Hash 入库 | `service/auth.go` bcrypt；`users.password_hash` | **满足✅** |
| 登录 JWT；前端存储并 `Authorization: Bearer` | `frontend/src/api.js`、`main.js` | **满足✅** |
| 查词：`word`、`ai_provider`；先库后 AI；AI JSON 含释义 + 3 例句；**不落库** | `service/word.go`、`pkg/ai/openai_compatible.go` | **满足✅** |
| 手动保存绑定 UserID | `service/word.go` `SaveWord` | **满足✅** |
| 词本分页 `page` / `page_size`；前端分页器 | `service/word.go`、`frontend/src/main.js` | **满足✅** |
| 按 ID 软删除 | `words.deleted_at`、`SoftDeleteWord` | **满足✅** |

**说明（AI 线路）**：作业原文允许「通义千问」等。本项目**主用阿里云 DashScope 兼容模式**（`ai_provider=qwen`）。另提供**可选第二套 OpenAI 兼容接口**（请求参数值为 `deepseek`，仅为代码与变量历史命名；详见 `.env.example`），不在此文档展开具体厂商名称。

### 五、部署与交付

| 要求摘要 | 核验证据 | 结论 |
|---|---|---|
| 后端 Dockerfile 多阶段、暴露 8080、精简镜像 | `backend/Dockerfile`：`golang:1.21-alpine` 编译 → `alpine` 运行 | **满足✅** |
| 前端：`nginx:alpine` + Vite 产物 + 自定义 `nginx.conf` | `frontend/Dockerfile`、`nginx.conf` | **满足✅** |
| Nginx 静态 + `/api/` 反代 | `nginx.conf` 两处 `server`（80/443）均配置 `location /api/` | **满足✅** |
| Compose：`db`、`backend`、`frontend` | `docker-compose.yml` | **满足✅** |
| 共享网络；仅暴露 frontend；容器名互访 | `networks: appnet`；仅 `frontend` 有 `ports`；Nginx → `backend:8080`，DSN `db:3306` | **满足✅** |
| `backend` `depends_on` `db` | 已配置 | **满足✅** |
| **禁止 AutoMigrate**；`init.sql` 挂 `docker-entrypoint-initdb.d` | `docs/init.sql` 挂载；代码无 `AutoMigrate` | **满足✅** |
| 对外 80/443 等 | `ports: "80:80"`、`"443:443"`；镜像内自签名 TLS | **满足✅** |

**仓库自检命令（可选）**：

```bash
rg "AutoMigrate" week05/homework/docker-gin/backend/ --glob "*.go" || true
# 期望：无匹配
```

### 六、文档

| 要求 | 核验 | 结论 |
|---|---|---|
| `README.md` 含姓名学校学号、任务索引、简介/架构、从零运行、AI Key 配置说明、一键启动、访问方式 | 本文档 | **满足✅** |
| `docs/api.md` 覆盖全部业务接口及错误码 | 打开 `docs/api.md` 核对 | **满足✅** |
| `docs/db.md` 表结构、字段、关联 | 打开 `docs/db.md` 核对 | **满足✅** |

---

## 开发任务索引（速查）

| 任务 | 实现位置 |
|---|---|
| 注册 / 登录 / JWT | `backend/service/auth.go`、`backend/api/auth.go`、`backend/api/middleware/jwt.go` |
| 查词 / 保存 / 列表 / 软删 | `backend/service/word.go`、`backend/api/word.go` |
| 跨域 | 开发 `frontend/vite.config.js`；生产 `frontend/nginx.conf`；后端无 CORS |
| 库表初始化 | `docs/init.sql` + `docker-compose.yml` 挂载 |
| 多阶段镜像 | `backend/Dockerfile`、`frontend/Dockerfile` |

---

## 项目简介与架构说明

1. 用户注册 / 登录，获得 JWT。  
2. 前端请求头携带 `Authorization: Bearer <token>`。  
3. **智能查词**：若该用户词本中已有该词且未删除 → 直接返回数据库（`source=db`）；否则调用大模型（`source=ai`），**不写库**。  
4. 用户点击「保存到单词本」→ 写入 `words` 表并绑定 `user_id`。  
5. 词本列表分页展示；删除为软删除（`deleted_at`）。

### 架构图（逻辑）

```mermaid
flowchart LR
  subgraph host["宿主机浏览器"]
    U[用户]
  end
  subgraph compose["Docker Compose / appnet"]
    F[Nginx frontend :80/:443]
    B[Gin backend :8080]
    D[(MySQL db)]
  end
  U -->|HTTP(S) 同源 /api| F
  F -->|proxy_pass /api| B
  B --> D
  B -->|HTTPS| EXT[DashScope 等 OpenAI 兼容 API]
```

---

## 目录结构（与仓库一致）

```text
week05/homework/docker-gin
├── backend/
│   ├── Dockerfile
│   ├── main.go
│   ├── .env.example
│   ├── api/                 # HTTP（Gin）
│   │   └── middleware/      # JWT
│   ├── service/             # 业务逻辑
│   ├── model/               # GORM 模型
│   └── pkg/                 # config / db / ai
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   └── src/
├── docs/
│   ├── api.md
│   ├── db.md
│   └── init.sql
├── docker-compose.yml
├── README.md
└── 要求.md
```

---

## AI 服务配置说明（本项目实际：阿里云为主）

| 用途 | 环境变量前缀 | `ai_provider` 取值（Query/Body） | 说明 |
|---|---|---|---|
| **主用** | `QWEN_*` | `qwen` | 阿里云 DashScope **OpenAI 兼容模式**。Base URL 固定为：`https://dashscope.aliyuncs.com/compatible-mode/v1`；`QWEN_MODEL` 按控制台（如 `qwen-plus`）。 |
| **可选备用** | `DEEPSEEK_*`（历史命名） | `deepseek` | 任意 **OpenAI Chat Completions 兼容** 服务；不配密钥则前端勿选「备用线路」。不在此列举具体厂商。 |

配置步骤：

1. `cp backend/.env.example backend/.env`  
2. 填写 `QWEN_API_KEY`（及按需调整 `QWEN_MODEL`）。  
3. 若需备用线路，再填写 `DEEPSEEK_API_KEY`（及必要时覆盖 `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`）。  
4. **至少保证主用或备用其一可用**，否则查词接口返回 `AI_ERROR`。

---

## 环境变量一览（`backend/.env`）

| 变量 | 必填 | 说明 |
|---|---|---|
| `JWT_SECRET` | 是 | 足够长的随机串 |
| `MYSQL_DSN` | 是 | Compose 内用主机名 `db` |
| `QWEN_API_KEY` | 主用场景必填 | DashScope Key |
| `QWEN_BASE_URL` | 否 | 默认即为 DashScope 兼容地址 |
| `QWEN_MODEL` | 否 | 默认 `qwen-plus` |
| `DEEPSEEK_API_KEY` | 否 | 仅启用「备用线路」时填 |
| `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` | 否 | 不配则用程序内默认值 |

---

## 从零启动（推荐：Docker 一键）

### 前置依赖

- Docker Desktop（或 Docker Engine）+ Docker Compose v2  
- 已按上文创建并编辑 **`backend/.env`**

### 启动命令

在 **`week05/homework/docker-gin`** 目录：

```bash
docker compose up -d --build
```

（若环境仍使用旧命令，可用 `docker-compose up -d --build`。）

### 访问方式

| 场景 | URL |
|---|---|
| 前端（HTTP） | `http://localhost/` |
| 前端（HTTPS，自签名证书） | `https://localhost/` |
| API（经 Nginx 同源） | `http://localhost/api/...` 或 `https://localhost/api/...` |

首次访问 HTTPS 浏览器会提示证书不受信任，本地演示选择「继续访问」即可。

### 数据库初始化注意

- `docs/init.sql` 挂载到 MySQL **`/docker-entrypoint-initdb.d/`**，仅在**数据卷首次初始化**时执行。  
- 若曾启动过旧库、需重新建表：见下文 **「停止并删除数据卷」**，用 `down -v` 后再 `up`。

---

## 日常运维：停止、再起、重建（Docker Compose）

以下命令均在项目根目录 **`week05/homework/docker-gin`** 下执行（请先 `cd` 到该路径）。  
若你本机仍使用旧版 CLI，可将 `docker compose` 换成 `docker-compose`（子命令相同）。

### 1）停止并删除容器（默认保留数据库数据）

```bash
docker compose down
```

| 项 | 说明 |
|---|---|
| **作用** | 停止并移除本 Compose 项目创建的**容器**及默认**网络**等。 |
| **数据卷** | `docker-compose.yml` 中的命名卷 **`db_data` 默认不会被删除**，MySQL 里已注册的用户、词本等一般在下次启动后仍在。 |
| **典型用途** | 暂时收工、修改 `backend/.env` 前先停机、释放 80/443 端口占用等。 |

### 2）后台再次启动（不重编镜像）

```bash
docker compose up -d
```

| 项 | 说明 |
|---|---|
| **作用** | 使用**已有镜像**按 `docker-compose.yml` 重新创建并启动所有服务（后台运行）。 |
| **典型用途** | 执行过 `down` 之后要把整套环境拉起来；或本机 Docker 重启后恢复栈。 |

### 3）改代码或 Dockerfile 之后：构建并启动

```bash
docker compose up -d --build
```

| 项 | 说明 |
|---|---|
| **作用** | 先按需**重新构建** `backend`、`frontend` 镜像，再 `-d` 启动。 |
| **典型用途** | 修改了 Go / 前端源码、`backend/Dockerfile`、`frontend/Dockerfile`、`nginx.conf` 等。 |

### 4）停止并删除数据卷（清空 MySQL，慎用）

```bash
docker compose down -v
```

| 项 | 说明 |
|---|---|
| **作用** | 在 `down` 基础上**删除** Compose 所管理的命名卷（含本项目的 **`db_data`**），数据库文件被清空。 |
| **下次启动** | 再执行 `docker compose up -d`（或带 `--build`）时，MySQL 会**重新初始化**，会再次执行 **`docs/init.sql`**。 |
| **注意** | **`-v` 不可恢复**，仅在你确认不需要保留库内数据时使用。 |

### 5）查看运行状态与日志（排障）

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f frontend
```

- `ps`：查看各服务是否 **running**。  
- `logs -f`：持续打印日志；按 **`Ctrl+C`** 仅结束日志跟随，**不会**自动停止容器。

---

## 本地开发模式（可选）

适合改代码调试；需本机安装 Go、Node。

1. **仅起数据库**：`docker compose up -d db`  
2. **本机跑后端**：若 `MYSQL_DSN` 使用 `db:3306`，则后端进程也应在能解析 `db` 的网络中（通常改为 **全套 Docker** 更简单）。若坚持本机 `go run`，请为 `db` 临时增加 `127.0.0.1:3306:3306` 映射，并把 DSN 主机改为 `127.0.0.1`。  
3. **本机前端**：`cd frontend && npm install && npm run dev` → `http://localhost:5173`，`/api` 走 Vite 代理到 `http://localhost:8080`。

---

## 接口速查（完整字段见 `docs/api.md`）

| 功能 | 方法 | 路径 | 鉴权 |
|---|---|---|---|
| 注册 | POST | `/api/register` | 否 |
| 登录 | POST | `/api/login` | 否 |
| 智能查词 | GET | `/api/words/query` | 是 |
| 保存单词 | POST | `/api/words` | 是 |
| 分页词本 | GET | `/api/words` | 是 |
| 软删 | DELETE | `/api/words/:id` | 是 |

---

## 数据库速查（详见 `docs/db.md`）

- **`users`**：`password_hash`（bcrypt），`username` 唯一。  
- **`words`**：外键 `user_id` → `users.id`，`(user_id, word)` 唯一，`deleted_at` 软删。

---

## 验收与自测清单

### 业务

- [ ] 注册成功，`users` 有记录且密码非明文  
- [ ] 登录返回 JWT；未带 Token 访问受保护接口 → `UNAUTHORIZED`  
- [ ] 已保存词 → 查词 `source=db`；未保存 → `source=ai` 且未自动入库  
- [ ] 手动保存后列表可分页；删除后列表不再出现  

### 工程

- [ ] `docker compose up -d --build` 三服务正常  
- [ ] 仅通过 **80 或 443** 完成全部操作（不直连 backend/db 端口）  
- [ ] 后端无 CORS、无 AutoMigrate  
- [ ] `docs/api.md`、`docs/db.md` 可读且与实现一致  

---

## 常见问题

1. **`AI_ERROR`**：检查 `backend/.env` 中 `QWEN_API_KEY`（及备用 `DEEPSEEK_API_KEY` 若选用备用线路）；网络需能访问对应 Base URL。  
2. **401**：检查 `Authorization: Bearer <token>` 与 `localStorage`。  
3. **表未创建**：确认 `init.sql` 挂载；必要时 `down -v` 清空卷后重建。  
4. **HTTPS 证书告警**：自签名预期行为；公网请换正式证书。  

---

## 文档索引

- `docs/api.md` — API 全量说明  
- `docs/db.md` — 表结构与关联  
- `docs/init.sql` — 建表脚本  
- `要求.md` — 作业原文  

---

## 其他说明（提交给老师）

- 跨域严格按规范：**开发 Vite 代理、生产 Nginx 同源反代，后端零 CORS**。  
- 表结构由 **`init.sql` + 挂载初始化** 管理，符合「可审计、可追溯」的企业习惯。  
- 查词与落库分离，避免误写入。  
- 目录 **`api` / `service` / `model`** 与作业示例一致；对外 **80/443** 与作业「等端口」表述一致。  
- **大模型主用阿里云 DashScope 兼容模式**；备用线路为可选第二套 OpenAI 兼容接口，细节由你在 `.env` 中配置，文档不绑定单一第三方品牌名。
