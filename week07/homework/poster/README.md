# 灵犀工坊 LinxCraft

在线海报设计器（Week 07 大作业）：基于 **React + Fabric.js** 的可视化编辑与 **Go + Gin** 的后端服务，单容器 Docker 部署。

---

## 项目基本信息

| 项目 | 内容 |
|------|------|
| 姓名 | 吴汉东 |
| 学校 | 中国地质大学（武汉） |
| 学号 | 20231003912 |

---

## 项目简介

灵犀工坊对标轻量「创客贴」体验：三栏工作台、可缩放画布、文本 / SVG 形状 / 图片素材、属性侧栏、右键图层与对齐操作、撤销重做与 PNG 导出。前端通过 Vite 开发时代理访问后端 API；生产环境由 Go 服务同时提供 `/api/*` 与静态资源（SPA 回退）。

---

## 功能与任务对照

以下为与课程要求及当前代码实现的对照（便于批改与自测）。

| 能力 | 状态 | 说明 |
|------|------|------|
| 用户注册 / 登录 | 已实现 | `POST /api/register`、`POST /api/login`，密码 bcrypt；JWT 默认 **7 天**有效 |
| 登录门禁 | 已实现 | 未登录仅见登录页；Token 存 `localStorage` |
| 三栏布局 | 已实现 | 顶栏 + 左素材 Tab + 中画布 + 右属性 |
| 顶栏 | 已实现 | Logo/标题、撤销/重做、PNG 下载、退出 |
| 画布 | 已实现 | 默认尺寸可在侧栏调整；背景色 / 背景图；底部缩放（CSS 容器缩放） |
| 文本 | 已实现 | 预设文案添加；侧栏字体、大小、颜色、粗斜体、下划线、删除线、对齐、字距/行距、透明度等 |
| 形状 | 已实现 | 多分类 SVG 素材 + 基础几何；填充、描边、透明度等 |
| 图片 | 部分实现 | 预设占位图、本地上传；**「AI 生成」按钮为占位（disabled）** |
| 元素交互 | 已实现 | Fabric.js 选择、拖拽、缩放、旋转；右键菜单：图层上下、置顶置底、水平/垂直居中、复制、删除 |
| 智能对齐辅助线 | 未实现 | 课程文档中的吸附辅助线当前未接入画布逻辑 |
| 撤销 / 重做 | 已实现 | `history-store` 快照栈，与部分画布操作联动 |
| 导出 PNG | 已实现 | 顶栏下载，`multiplier: 2` 提高清晰度 |
| 后端海报持久化 API | 已实现 | 见下文「HTTP API」；数据为 SQLite + GORM |
| 编辑器内云保存 / 作品列表 UI | 未接线 | 后端 CRUD 已就绪，前端编辑器尚未调用 `/api/posters` 做保存与载入 |
| Docker 单容器 | 已实现 | 多阶段构建，对外 **8080** |

更细的迭代记录见仓库内 `progress.md`；架构与数据模型见 `ARCHITECTURE.md`（其中个别规划项如 AI 代理路由以本 README 与 `main.go` 为准）。

---

## 仓库目录结构（摘要）

```
poster/
├── README.md                 # 本文件
├── ARCHITECTURE.md           # 架构与数据模型
├── progress.md               # 开发进度
├── docker-compose.yml
├── Dockerfile
├── .env                      # 提交作业要求附带（见下「环境变量」）
├── client/                   # Vite + React 前端
│   ├── src/
│   │   ├── store/            # canvas / element / history / auth
│   │   ├── components/       # layout, canvas, panels, properties, ui, shared
│   │   ├── pages/            # LoginPage, EditorPage
│   │   └── ...
│   ├── public/shapes/        # SVG 素材（basic / festival / other）
│   └── package.json
└── server/                   # Go API
    ├── main.go
    ├── config/ config.go
    ├── handlers/ auth.go, poster.go
    ├── middleware/ auth.go
    ├── models/ user.go, poster.go
    ├── database/ db.go
    └── static/               # 生产构建时由 Docker 将前端 dist 拷入
```

---

## 技术栈（版本以仓库为准）

| 层级 | 技术 | 版本说明 |
|------|------|----------|
| 构建 | Vite | ^8.x |
| 前端 | React + TypeScript | React ^19.x，TS ~6.x |
| 样式 | Tailwind CSS + shadcn（Base UI） | Tailwind ^4.x |
| 画布 | Fabric.js | ^7.3.x |
| 状态 | Zustand | ^5.x |
| 颜色 | react-colorful | ^5.x |
| 图标 | lucide-react | ^1.x |
| 后端 | Go + Gin + GORM | Go 1.23，见 `server/go.mod` |
| 数据库 | SQLite（`mattn/go-sqlite3`，CGO） | 开发/容器内文件库 |
| 部署 | Docker Compose | 单服务 `poster`，端口 8080 |

---

## HTTP API

**公开**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/register` | 注册，`{ "username", "password" }` |
| POST | `/api/login` | 登录，返回 `{ "token" }` |

**需 Header：`Authorization: Bearer <JWT>`**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posters` | 当前用户海报列表 |
| POST | `/api/posters` | 创建，`title`, `width`, `height`, `data`（Fabric JSON 字符串等） |
| GET | `/api/posters/:id` | 获取单条 |
| PUT | `/api/posters/:id` | 更新 |
| DELETE | `/api/posters/:id` | 删除 |

---

## 环境变量（`.env`）

`docker-compose.yml` 使用 `env_file: .env`。服务端 `config/config.go` 读取：

| 变量 | 含义 | 默认 |
|------|------|------|
| `PORT` | 监听端口 | `8080` |
| `JWT_SECRET` | JWT 签名密钥 | 内置占位字符串（**生产务必修改**） |
| `DB_PATH` | SQLite 文件路径 | `poster.db`（相对工作目录） |

作业要求提交 `.env` 时，可使用与默认等价的示例，但 **`JWT_SECRET` 请勿使用弱口令或真实生产密钥混用**。

---

## 本地开发

**前置条件**：Node.js（建议 18+，与 Docker 前端阶段 22 一致亦可）、Go 1.23+、npm。

```bash
# 终端 1：后端（默认 :8080）
cd week07/homework/poster/server
go run .

# 终端 2：前端（:5173，/api 代理到 :8080）
cd week07/homework/poster/client
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。登录/注册请求经 Vite 代理转发至 `http://localhost:8080/api`。

**仅验证前端构建**

```bash
cd week07/homework/poster/client
npm run build
```

---

## 生产 / Docker

在 **`poster/` 目录**（含 `Dockerfile` 与 `docker-compose.yml`）执行：

```bash
cd week07/homework/poster
docker compose up -d --build
```

访问 **`http://localhost:8080`**。镜像构建流程概要：

1. **frontend**：`npm ci` / `npm install` + `npm run build` → `dist/`  
2. **backend**：Alpine 基础镜像上安装 **`gcc`、`musl-dev`**（SQLite 驱动需 **CGO**），`go build` 产出 `poster-server`  
3. **final**：Alpine 运行镜像，仅拷贝二进制与 `static/`（前端产物），**运行阶段不依赖 gcc**

若 Docker 构建报错 `gcc not found`，请确认使用的是当前仓库中的 `Dockerfile`（backend 阶段含 `apk add gcc musl-dev`）。

---

## 作业提交自检（与课程说明对齐）

- [ ] `client/`：`npm run dev`（5173）与 `npm run build` 通过  
- [ ] `server/`：本地 `go run .` 监听 8080  
- [ ] `poster/` 下 `docker compose up -d --build` 可访问 8080  
- [ ] 根目录 `README.md`（本文件）含项目信息、任务与技术要点  
- [ ] 附带演示视频（≤5 分钟，覆盖文本 / 形状 / 图片操作及技术点说明）  
- [ ] 按课程要求提交 `.env`（评分用）

---

## 相关文档

- `ARCHITECTURE.md` — 目录约定、数据模型、状态设计、部署策略  
- `progress.md` — 按日期的实现里程碑  
