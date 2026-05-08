# 灵犀工坊 LinxCraft

## 项目基本信息

- **姓名**：吴汉东
- **学校**：中国地质大学（武汉）
- **学号**：20231003912

## 项目简介

灵犀工坊（LinxCraft）— 基于 React + Go 的在线海报设计器，支持文本、形状、图片元素的拖拽编辑，提供智能对齐、撤销重做、PNG 导出等功能。对标"创客贴"，追求丝滑的元素操作与美观的界面。

## 开发任务索引

- [ ] 登录/注册 + JWT 认证
- [ ] 三栏布局（左侧面板 + 画布 + 右侧属性面板）
- [ ] 顶部工具栏（Logo、撤销/重做、下载、退出）
- [ ] 画布基础功能（600×800px、自定义尺寸、缩放、背景）
- [ ] 文本元素（添加、编辑属性、双击编辑）
- [ ] 形状元素（SVG 素材库、分类面板、属性编辑）
- [ ] 图片元素（预设图片、本地上传、AI 生成）
- [ ] 元素操作（选中框、拖拽、缩放、旋转、对齐辅助线）
- [ ] 右键菜单（图层排序、居中排版）
- [ ] 撤销/重做
- [ ] 导出 PNG
- [ ] Docker 单容器部署

## 核心技术实现

### 1. 画布引擎 — Fabric.js

使用 Fabric.js 7.3 作为 2D 渲染引擎，封装为 React 组件。通过 `canvas.toJSON()` 实现状态序列化，支持撤销/重做快照。利用 Fabric.js 内置的选中框、缩放手柄、旋转手柄实现元素交互。

### 2. 状态管理 — Zustand

采用 Zustand 5.x 管理全局状态，拆分为四个独立 store：
- `canvas-store`：画布尺寸、背景、缩放
- `element-store`：元素列表、选中状态、图层操作
- `history-store`：撤销/重做历史栈
- `auth-store`：JWT token 和用户信息

### 3. 智能对齐辅助线

拖拽元素时实时计算与画布中心线、其他元素边缘的距离，距离 < 5px 时吸附并显示辅助线。

### 4. 后端架构

Go + Gin 提供 RESTful API，GORM 操作 SQLite 数据库。JWT 认证保证多日会话，海报数据以 Fabric.js JSON 格式存储。

### 5. 部署方案

Docker 多阶段构建：Node 阶段打包前端静态资源 → Go 阶段编译后端并嵌入静态文件 → 单容器运行在 8080 端口。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite 8 + React 19 + TypeScript 6 |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 画布 | Fabric.js 7.3 |
| 状态 | Zustand 5 |
| 后端 | Go + Gin + GORM + SQLite |
| 部署 | Docker (port 8080) |

## 启动方式

```bash
# 开发模式
cd client && npm install && npm run dev    # 前端 :5173
cd server && go run .                      # 后端 :8080

# Docker 部署
docker compose up -d --build               # http://localhost:8080
```
