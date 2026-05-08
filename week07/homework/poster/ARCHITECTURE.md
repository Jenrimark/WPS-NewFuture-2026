# 在线海报设计器 — 架构设计文档

## 1. 项目概述

对标"创客贴"的在线海报设计器，支持文本、形状、图片元素的拖拽编辑，提供撤销重做、智能对齐、PNG 导出等功能。

## 2. 技术栈

| 层级 | 技术 | 版本 | 职责 |
|------|------|------|------|
| 构建 | Vite | 8.x | 开发服务器 + 生产打包 |
| UI 框架 | React + TypeScript | 19.x / 6.x | 组件化 UI |
| 样式 | Tailwind CSS + shadcn/ui | v4 / base-nova | 原子化 CSS + 通用组件 |
| 画布引擎 | Fabric.js | 7.3.x | 2D Canvas 渲染、元素交互 |
| 状态管理 | Zustand | 5.x | 全局状态 + 撤销/重做 |
| 图标 | Lucide React | latest | 统一图标库 |
| 颜色选择器 | react-colorful | latest | 颜色选取 |
| 后端框架 | Go + Gin | — | HTTP API |
| ORM | GORM | — | 数据库操作 |
| 数据库 | SQLite | — | 本地持久化 |
| 部署 | Docker | — | 单容器部署 |

## 3. 目录结构

```
poster/
├── README.md                    # 项目说明
├── ARCHITECTURE.md              # 本文件
├── docker-compose.yml           # Docker 编排
├── Dockerfile                   # 单容器构建
├── .env                         # 环境变量（提交用）
│
├── client/                      # 前端项目（Vite + React）
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── vite.config.ts
│   ├── components.json          # shadcn/ui 配置
│   ├── public/
│   │   └── shapes/              # SVG 形状素材
│   │       ├── basic/           # 基础形状
│   │       ├── festival/        # 节日形状
│   │       └── other/           # 其它形状
│   └── src/
│       ├── main.tsx             # 入口
│       ├── App.tsx              # 根组件（路由）
│       ├── index.css            # Tailwind + shadcn 主题
│       ├── lib/
│       │   └── utils.ts         # cn() 工具函数
│       ├── hooks/               # 自定义 hooks
│       ├── types/
│       │   └── index.ts         # 全局类型定义
│       ├── store/
│       │   ├── canvas-store.ts  # 画布状态（尺寸、背景、缩放）
│       │   ├── element-store.ts # 元素列表、选中、操作
│       │   ├── history-store.ts # 撤销/重做栈
│       │   └── auth-store.ts    # 登录状态 + token
│       ├── components/
│       │   ├── ui/              # shadcn/ui 组件
│       │   ├── layout/
│       │   │   ├── Header.tsx        # 顶部工具栏
│       │   │   ├── LeftPanel.tsx     # 左侧素材面板
│       │   │   ├── CanvasArea.tsx    # 中间画布区
│       │   │   └── RightPanel.tsx    # 右侧属性面板
│       │   ├── canvas/
│       │   │   ├── FabricCanvas.tsx  # Fabric.js 画布封装
│       │   │   ├── ZoomControls.tsx  # 缩放控制
│       │   │   └── AlignmentGuides.tsx # 对齐辅助线
│       │   ├── panels/
│       │   │   ├── TextPanel.tsx     # 文本素材面板
│       │   │   ├── ShapePanel.tsx    # 形状素材面板
│       │   │   └── ImagePanel.tsx    # 图片素材面板
│       │   ├── properties/
│       │   │   ├── CanvasProperties.tsx   # 画布属性
│       │   │   ├── TextProperties.tsx     # 文本属性
│       │   │   ├── ShapeProperties.tsx    # 形状属性
│       │   │   └── ImageProperties.tsx    # 图片属性
│       │   └── shared/
│       │       ├── ContextMenu.tsx   # 右键菜单
│       │       └── ColorPicker.tsx   # 颜色选择器封装
│       └── pages/
│           ├── LoginPage.tsx    # 登录/注册页
│           └── EditorPage.tsx   # 编辑器主页面
│
└── server/                      # 后端项目（Go + Gin）
    ├── main.go                  # 入口
    ├── go.mod
    ├── go.sum
    ├── config/
    │   └── config.go            # 配置（端口、JWT 密钥等）
    ├── models/
    │   ├── user.go              # 用户模型
    │   └── poster.go            # 海报模型
    ├── handlers/
    │   ├── auth.go              # 注册/登录
    │   └── poster.go            # 海报 CRUD
    ├── middleware/
    │   └── auth.go              # JWT 认证中间件
    ├── database/
    │   └── db.go                # GORM 初始化 + 自动迁移
    └── static/                  # 前端构建产物（Docker 构建时复制）
```

## 4. 数据模型

### User
```go
type User struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Username  string    `gorm:"uniqueIndex;size:50" json:"username"`
    Password  string    `gorm:"size:255" json:"-"` // bcrypt hash
    CreatedAt time.Time `json:"created_at"`
    Posters   []Poster  `gorm:"foreignKey:UserID" json:"posters,omitempty"`
}
```

### Poster
```go
type Poster struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    UserID    uint      `gorm:"index" json:"user_id"`
    Title     string    `gorm:"size:100" json:"title"`
    Width     int       `json:"width"`
    Height    int       `json:"height"`
    Data      string    `gorm:"type:text" json:"data"` // Fabric.js JSON
    ThumbURL  string    `gorm:"size:500" json:"thumb_url,omitempty"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

## 5. API 设计

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /api/register | 注册 | 否 |
| POST | /api/login | 登录，返回 JWT | 否 |
| GET | /api/posters | 获取当前用户海报列表 | JWT |
| POST | /api/posters | 创建海报 | JWT |
| PUT | /api/posters/:id | 更新海报 | JWT |
| DELETE | /api/posters/:id | 删除海报 | JWT |
| POST | /api/ai/generate | AI 生成图片（代理百炼 API） | JWT |

## 6. 前端状态管理（Zustand）

### canvas-store
```
- width, height: 画布尺寸
- backgroundColor: 背景色
- backgroundImage: 背景图 URL
- zoom: 缩放比例 (0.1 ~ 5.0)
- setWidth/setHeight/setZoom/setBackground
```

### element-store
```
- elements: PosterElement[]
- selectedId: string | null
- addElement/removeElement/updateElement
- selectElement/clearSelection
- moveLayerUp/moveLayerDown/moveToTop/moveToBottom
- alignCenterH/alignCenterV
```

### history-store
```
- past: Snapshot[]      // 撤销栈
- future: Snapshot[]    // 重做栈
- pushSnapshot()        // 记录当前状态
- undo()               // 撤销
- redo()               // 重做
- canUndo/canRedo      // 按钮状态
```

### auth-store
```
- token: string | null
- user: { id, username } | null
- login/register/logout
- isAuthenticated
```

## 7. 核心交互流程

### 元素添加流程
```
左侧面板点击 → 设置 pendingTool → 画布监听 mousedown
→ mousemove 绘制预览 → mouseup 创建 Fabric.js 对象
→ pushSnapshot() → 更新 element-store
```

### 元素选中流程
```
画布 object:selected 事件 → 更新 selectedId
→ 右侧面板切换到对应属性面板 → 属性修改同步回 Fabric 对象
```

### 撤销/重做流程
```
任何元素操作后 → pushSnapshot() 保存当前 state
undo() → 从 past 弹出 → 当前压入 future → 恢复画布
redo() → 从 future 弹出 → 当前压入 past → 恢复画布
```

## 8. Docker 部署策略

单容器方案：
1. Dockerfile 多阶段构建：Node 阶段打包前端 → Go 阶段编译后端 → 复制静态文件
2. Go 服务器同时托管 API（/api/*）和静态文件（/*）
3. docker-compose.yml 仅定义单个服务，映射 8080 端口

```yaml
# docker-compose.yml
services:
  poster:
    build: .
    ports:
      - "8080:8080"
    env_file: .env
```

## 9. 开发阶段划分

| 阶段 | 内容 | 产出 |
|------|------|------|
| 一 | 架构规划 | ARCHITECTURE.md + README.md + 目录结构 |
| 二 | 静态界面 | 三栏布局 + Tab 面板 + 属性面板空壳 |
| 三 | 画布核心 | Fabric.js 集成 + 元素操作 + 撤销重做 + 导出 |
| 四 | 后端 API | Go 服务 + 注册登录 + 海报 CRUD |
| 五 | 联调部署 | 前后端联调 + OSS/AI + Docker |
