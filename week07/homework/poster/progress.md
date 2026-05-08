# Week07 海报设计器 - 开发进度记录

## 2026-05-08 阶段一：项目初始化与架构规划 ✓

### 已完成
- [x] ARCHITECTURE.md 架构设计文档
- [x] README.md 模板
- [x] 前端目录结构：store/ types/ hooks/ components/{layout,canvas,panels,properties,shared}/ pages/
- [x] 后端目录结构：config/ models/ handlers/ middleware/ database/ static/
- [x] TypeScript 类型定义：types/index.ts
- [x] Docker 配置：Dockerfile + docker-compose.yml + .env

## 2026-05-08 阶段二：前端静态界面与布局铺设 ✓

### 已完成
- [x] 14 个 shadcn/ui 组件安装（button, tabs, input, label, select, separator, slider, toggle, toggle-group, popover, tooltip, dropdown-menu, scroll-area, dialog）
- [x] 三栏布局：Header + LeftPanel + CanvasArea + RightPanel
- [x] 左侧 Tab 面板：TextPanel（4种预设）、ShapePanel（3分类15个SVG形状）、ImagePanel（6个预设+上传+AI占位）
- [x] 右侧属性面板：CanvasProperties（尺寸/背景色/背景图/重置）
- [x] LoginPage 登录/注册页面
- [x] EditorPage 编辑器主页面
- [x] TooltipProvider 包裹

## 2026-05-08 阶段三：核心画布系统研发 ✓

### 已完成
- [x] Zustand 4 个 store：canvas-store, element-store, history-store, auth-store
- [x] FabricCanvas 组件：Fabric.js 7.3 初始化、选中事件、对象同步
- [x] 文本添加：点击预设 → IText 对象创建，支持字号/粗体
- [x] 形状添加：rect/circle/triangle + SVG 形状加载
- [x] 图片添加：本地文件上传 + 预设图片（data URL）
- [x] 元素操作：选中、拖拽、缩放、旋转（Fabric.js 内置）
- [x] 右键菜单：ContextMenu 组件（图层上移/下移/置顶/置底/水平居中/垂直居中/复制/删除）
- [x] TextProperties：字体、字号、颜色、粗体/斜体/下划线/删除线、对齐、字间距、行间距、透明度
- [x] ShapeProperties：背景色、描边颜色、描边宽度、透明度
- [x] ImageProperties：尺寸显示、透明度、旋转
- [x] 右侧属性面板动态切换：CanvasProperties ↔ Text/Shape/ImageProperties
- [x] Header 撤销/重做按钮（状态联动）+ 导出 PNG
- [x] 缩放控制：+/- 按钮 + 百分比输入

## 2026-05-08 阶段四：Go 后端接口开发 ✓

### 已完成
- [x] go.mod 依赖配置（Gin, GORM, SQLite, JWT, bcrypt）
- [x] config/config.go 配置加载（端口、JWT密钥、数据库路径）
- [x] models/user.go + models/poster.go 数据模型
- [x] database/db.go GORM 初始化 + 自动迁移
- [x] middleware/auth.go JWT 生成 + 认证中间件（7天有效期）
- [x] handlers/auth.go 注册/登录（bcrypt 密码哈希）
- [x] handlers/poster.go 海报 CRUD（List/Create/Get/Update/Delete）
- [x] main.go 路由配置 + SPA 静态文件服务

## 2026-05-08 阶段五：全链路联调与部署 ✓

### 已完成
- [x] Go 后端编译通过
- [x] 前端构建通过（tsc + vite build）
- [x] Dockerfile 多阶段构建（Node→Go→Alpine）
- [x] docker-compose.yml 单容器 8080 端口
- [x] main.go SPA 路由回退 + 静态文件存在性检查

### 构建产物
- 前端：dist/ (CSS 66KB + JS 710KB)
- 后端：poster-server 二进制

### 启动方式
```bash
# 开发模式
cd client && npm run dev    # :5173
cd server && go run .       # :8080

# Docker 部署
docker compose up -d --build  # http://localhost:8080
```
