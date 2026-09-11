# WPS-NewFuture-2026

WPS新未来训练营（2026）

## 相关链接

- **用户中心：** https://campus.wps.cn/usercenter/home
- **课程内容 1：** https://campus.wps.cn/contentpreview/07fa7fb8-df64-4306-addc-ffd305b968db
- **课程内容 2：** https://campus.wps.cn/contentpreview/7e5a0755-818b-46a6-ba23-8071e3a634a6
- **Git 仓库：** https://git.wpsit.cn/

## 项目结构

| 目录 | 项目 | 技术栈 | 说明 |
|------|------|--------|------|
| [1-LingXi](./1-LingXi/) | 灵犀 AI 对话助手 | HTML + CSS + Vanilla JS | 仿 WPS 灵犀风格，接入阿里云百炼多模型，流式输出、Markdown 渲染、深色主题 |
| [2-Course](./2-Course/) | 在线学习管理平台 | React 19 + Vite + AntD / Node.js Koa + SQLite | 前后端分离，登录鉴权、工作台图表、课程与学生管理 |
| [3-Billing](./3-Billing/) | 阶梯电价与峰谷计费 | Go 1.22 | 阶梯电价 + 峰谷时段因子，含单元测试与流程图 |
| [4-Docker-Gin](./4-Docker-Gin/) | 英语单词学习助手 | Go Gin + GORM + MySQL + Nginx | 前后端分离，大模型生成释义与例句，Docker Compose 全栈部署 |
| [5-Monitor](./5-Monitor/) | 服务健康探测器 | Go 1.23 | 高并发 CLI 健康探测，HTTP/TCP、重试、超时、报表输出 |
| [6-Gin-Fullstack](./6-Gin-Fullstack/) | Gin Fullstack 二开 | Vue3 + Element Plus / Gin + Gorm + SQLite | 基于 gin-vue-admin 二开，含用户行为追踪 |
| [7-Gin-Grpc-file-service](./6-Gin-Grpc-file-service/) | Gin + gRPC + SQLite 文件服务 | Go gRPC + Gin + SQLite | 双进程架构：gRPC 元数据服务 + Gin HTTP 文件上传下载 |
| [8-Poster](./7-Poster/) | 灵犀工坊 LinxCraft 在线海报设计器 | React + Fabric.js / Go + Gin | 大作业：可视化画布编辑、云端作品、OSS 直传、百炼文生图，单容器 Docker 部署 |

## 项目文档

### 核心文档
- **大作业完整指南：** [2027高校前置班全栈项目大作业.md](./2027高校前置班全栈项目大作业.md)
  - **作业方向总览**：服务端 / 前端 / 移动端三大方向
  - **方向一**：全栈偏服务端（HR招聘系统）- gRPC架构 + Eino AI + 私有OSS
  - **方向二**：全栈偏前端（在线海报设计器）- 本项目实现的功能
  - **方向三**：移动端 - Android/iOS/HarmonyOS
  - **常见问题FAQ** + **提交清单** + **参考资源**

### 重点内容
| 章节 | 说明 |
|------|------|
| 作业方向总览 | 三大方向概览、联系人信息、参考文档链接 |
| 前端海报设计器 | 完整功能需求（画布、文本、形状、图片）、提交要求、视频规范 |
| 全栈服务端 | gRPC架构、OSS集成、Eino AI框架使用规范 |
| 常见问题 | 技术栈选择、Key管理、视频录制等FAQ |
| 提交清单 | 两个方向的完整文件清单和检查项 |

### 快速链接
- **前端海报设计器详细需求**：[2027高校前置班全栈项目大作业.md#方向二全栈偏前端在线海报设计器](./2027高校前置班全栈项目大作业.md)
- **提交清单**：[2027高校前置班全栈项目大作业.md#-提交清单](./2027高校前置班全栈项目大作业.md)
- **常见问题**：[2027高校前置班全栈项目大作业.md#-常见问题](./2027高校前置班全栈项目大作业.md)

## 快速开始

各模块均为独立工程，进入对应目录后以其 README 为准：

- **前端类（1-LingXi / 2-Course / 7-Poster）**：`npm install` 后启动 Vite 开发服务器，或按模块 README 的生产方式运行。
- **Go 类（3-Billing / 5-Monitor）**：在模块目录执行 `go run .`，测试执行 `go test -v ./...`。
- **全栈部署类（4-Docker-Gin / 7-Poster）**：根目录执行 `docker compose up -d`（Nginx 为唯一对外入口）。
- **6-Gin-Grpc-file-service**：先执行 `scripts/check-env.sh` 检查 protoc / SQLite 依赖，再按 `make` 流程编译启动。

> 注意：各模块的 API Key、JWT 密钥等敏感信息只写入本地 `.env`，仓库已通过 `.gitignore` 忽略，切勿提交真实密钥。
