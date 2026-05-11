# 灵犀工坊 LinxCraft

在线海报设计器（Week 07 大作业）：基于 **React + Fabric.js** 的可视化编辑与 **Go + Gin** 的后端服务，单容器 Docker 部署。

**第二轮开发**已补齐：画布统一序列化与云端作品、阿里云 OSS STS 直传、百炼文生图代理、智能对齐辅助线，以及 `.env.example` 环境说明模板。

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

海报数据以 **Fabric `toObject(['id'])` + 元数据** 封装为 `v:1` JSON 存入后端 `data` 字段；载入时 `loadFromJSON` 并同步 Zustand。撤销/重做基于同一套序列化字符串栈。

---

## 功能与任务对照

以下为与课程要求及当前代码实现的对照（便于批改与自测）。

| 能力 | 状态 | 说明 |
|------|------|------|
| 用户注册 / 登录 | 已实现 | `POST /api/register`、`POST /api/login`，密码 bcrypt；JWT 默认 **7 天**有效 |
| 登录门禁 | 已实现 | 未登录仅见登录页；Token 存 `localStorage` |
| 三栏布局 | 已实现 | 顶栏 + 左素材 Tab + 中画布 + 右属性 |
| 顶栏 | 已实现 | Logo/标题、撤销/重做、**云作品**（列表/保存/打开）、PNG 下载、退出 |
| 画布 | 已实现 | 右侧「画布属性」联动 Zustand：尺寸、背景色、背景图上传、重置背景；底部缩放（CSS） |
| 文本 | 已实现 | 预设文案添加；侧栏字体、大小、颜色、粗斜体、下划线、删除线、对齐、字距/行距、透明度等 |
| 形状 | 已实现 | 多分类 SVG 素材 + 基础几何；填充、描边、透明度等 |
| 图片 | 已实现 | 预设占位、本地上传（**优先 OSS STS 直传**，未配置则回退 Data URL）、**百炼 AI 生成**（`POST /api/ai/generate`） |
| 元素交互 | 已实现 | Fabric.js 选择、拖拽、缩放、旋转；右键菜单：图层顺序、水平/垂直居中、复制、删除（与 Fabric 与 store 同步） |
| 智能对齐辅助线 | 已实现 | `object:moving` 边/中心吸附（约 5px），临时红色辅助线，`excludeFromExport` 不进入导出与保存 |
| 撤销 / 重做 | 已实现 | 与画布一致的 **poster JSON 栈**（`history-store`），`__importPosterData` 还原 |
| 导出 PNG | 已实现 | 顶栏下载，`multiplier: 2` |
| 后端海报持久化 API | 已实现 | SQLite + GORM；保存时可带 **`thumb_url`**（前端 canvas 缩略图 data URL） |
| 编辑器内云保存 / 作品列表 | 已实现 | 顶栏「云作品」：`GET/POST/PUT /api/posters`，打开作品 `GET /api/posters/:id` 并 `resetHistoryStack` |
| OSS STS | 已实现 | `GET /api/oss/sts`（AssumeRole），前端 `ali-oss` 上传；需 RAM 角色 + 用户 `AssumeRole` 权限 |
| 百炼文生图 | 已实现 | `POST /api/ai/generate`，环境变量 `DASHSCOPE_*` |
| Docker 单容器 | 已实现 | 多阶段构建，对外 **8080**；`env_file: .env` |

更细的迭代记录见 `progress.md`；架构见 `ARCHITECTURE.md`（若与本文或 `main.go` 不一致，以运行时代码为准）。

---

## 仓库目录结构（摘要）

```
poster/
├── README.md
├── .env.example              # 环境变量模板（复制为 .env）
├── ARCHITECTURE.md
├── progress.md
├── docker-compose.yml
├── Dockerfile
├── .env                      # 作业提交附带（勿泄露真实密钥）
├── client/
│   ├── src/
│   │   ├── lib/              # poster-serialization.ts, api.ts
│   │   ├── store/
│   │   ├── components/     # layout, canvas, panels, properties, dialogs, ui, shared
│   │   ├── pages/
│   │   └── types/
│   ├── public/shapes/
│   └── package.json
└── server/
    ├── main.go
    ├── config/config.go
    ├── handlers/             # auth.go, poster.go, oss.go, ai.go
    ├── middleware/
    ├── models/
    ├── database/
    └── static/               # 生产构建产物（Docker 拷入）
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
| OSS 上传 | ali-oss | 浏览器 STS 临时凭证上传 |
| 颜色 | react-colorful | ^5.x |
| 图标 | lucide-react | ^1.x |
| 后端 | Go + Gin + GORM | Go 1.23；STS 使用 `alibaba-cloud-sdk-go/services/sts` |
| 数据库 | SQLite（CGO） | `mattn/go-sqlite3` |
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
| POST | `/api/posters` | 创建：`title`, `width`, `height`, `data`（海报 JSON 字符串）, 可选 `thumb_url` |
| GET | `/api/posters/:id` | 获取单条（含 `data`） |
| PUT | `/api/posters/:id` | 更新（字段同上，按需部分提交） |
| DELETE | `/api/posters/:id` | 删除 |
| GET | `/api/oss/sts` | 返回 AssumeRole 临时凭证与 `bucket`/`region`/`prefix`；未配置时 **503** |
| POST | `/api/ai/generate` | `{ "prompt" }`，轮询百炼任务后返回 `{ "url" }`；未配置 Key 时 **503** |

---

## 环境变量

**模板**：复制 [.env.example](./.env.example) 为 `.env` 并按需填写。`docker-compose.yml` 使用 `env_file: .env`。

| 变量 | 含义 | 默认 / 备注 |
|------|------|-------------|
| `PORT` | 监听端口 | `8080` |
| `JWT_SECRET` | JWT 签名 | 务必改为强随机串 |
| `DB_PATH` | SQLite 路径 | `poster.db` |
| `ALIYUN_ACCESS_KEY_ID` | RAM 用户 AK（调用 STS） | OSS 直传必填 |
| `ALIYUN_ACCESS_KEY_SECRET` | RAM 用户 SK | 同上 |
| `ALIYUN_RAM_ROLE_ARN` | 可被扮演的角色 ARN | 如 `acs:ram::<账号ID>:role/<角色名>` |
| `ALIYUN_STS_REGION` | STS 接口地域 | 默认 `cn-hangzhou` |
| `OSS_REGION` | OSS Region | 如 `oss-cn-beijing` |
| `OSS_BUCKET` | Bucket 名称 | |
| `OSS_UPLOAD_PREFIX` | 对象键前缀 | 默认 `poster-uploads/` |
| `DASHSCOPE_API_KEY` | 百炼 API Key | AI 配图必填 |
| `DASHSCOPE_MODEL` | 模型名 | 默认 `qwen-image-plus` |
| `DASHSCOPE_BASE_URL` | 百炼网关 | 默认官方地址 |

**注意**：本机直接 `go run .` **不会自动读取 `.env` 文件**，需自行 `export` 变量或使用 Docker Compose。Docker 部署已通过 `env_file` 注入。

作业提交附带 `.env` 时，可使用占位值或与 `.env.example` 一致；**勿提交真实生产密钥**。

---

## 本地开发

**前置条件**：Node.js（建议 18+）、Go 1.23+、npm。

```bash
# 终端 1：后端（默认 :8080）
cd week07/homework/poster/server
# 若不用 Docker，需先 export 变量或借助 direnv 等加载 .env
go run .

# 终端 2：前端（:5173，/api 代理到 :8080）
cd week07/homework/poster/client
npm install
npm run dev
```

**路径提示**：请在含 `go.mod` 的 `server/` 目录执行 `go run .`。启动成功日志含「数据库初始化成功」「服务器启动在端口 …」。

浏览器访问 `http://localhost:5173`。

**仅验证前端构建**

```bash
cd week07/homework/poster/client
npm run build
```

---

## 生产 / Docker

在 **`poster/`** 目录执行：

```bash
cd week07/homework/poster
docker compose up -d --build
```

访问 **`http://localhost:8080`**。构建要点：前端 `dist` → 运行镜像 `static/`；后端 **CGO + SQLite**，构建阶段需 `gcc`、`musl-dev`。

---

## 作业提交自检（与课程说明对齐）

- [ ] `client/`：`npm run dev`（5173）与 `npm run build` 通过  
- [ ] `server/`：本地 `go run .` 监听 8080（或 Docker 内等价）  
- [ ] `poster/` 下 `docker compose up -d --build` 可访问 8080  
- [ ] 本 README 含项目信息、任务与技术要点  
- [ ] 演示视频（≤5 分钟，覆盖文本 / 形状 / 图片及技术点）  
- [ ] 提交 `.env`（可与 `.env.example` 对齐的示例值；敏感项勿用生产真密钥）

---

## 相关文档

- `ARCHITECTURE.md` — 目录约定、数据模型、部署策略  
- `progress.md` — 按日期的实现里程碑  
- `docs/规划.md` — 需求与设计草案  
