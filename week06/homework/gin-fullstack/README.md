# Gin Fullstack 二开作业说明（Week06）

## 项目基本信息

| 字段 | 内容 |
|---|---|
| 学校 | 中国地质大学（武汉） |
| 姓名 | 吴汉东 |
| 学号 | 20231003912 |
| 作业目录 | `week06/homework/gin-fullstack` |
| 历史文档 | `README_OLD.md`（已保留） |
| 后端启动 | `cd week06/homework/gin-fullstack/server && go run main.go` |
| 前端启动 | `cd week06/homework/gin-fullstack/web && npm install && npm run dev` |
| 初始化入口 | `http://localhost:8080/#/init` |
| 登录入口 | `http://localhost:8080/#/login` |

---

## 作业要求符合性检查（对照 `week06/homework/作业要求.md`）

| # | 要求摘要 | 当前实现 | 状态 |
|---|---|---|---|
| 1 | 使用 SQLite 启动并完成初始化 | `server/config.yaml` 已设置 `system.db-type: sqlite`，并通过初始化页完成建库 | ✅ |
| 2 | 前后端可启动（`go run main.go` / `npm run dev`） | README 已给出完整命令与入口地址 | ✅ |
| 3 | 用户管理新增“登录IP、登录时间”两列 | `web/src/view/superAdmin/user/user.vue` 已新增列 | ✅ |
| 4 | 登录时间格式 `YYYY-MM-DD HH:mm` | 前端 `formatLoginTime()` 已实现 | ✅ |
| 5 | 登录成功后写入用户最后登录信息 | `TokenNext` 中写入 `last_login_ip`、`last_login_time` | ✅ |
| 6 | README 包含基本信息、任务索引、核心技术实现 | 本文档已覆盖，且补充复现与问题记录 | ✅ |

---

## 开发任务索引

| 任务 | 内容 | 状态 |
|---|---|---|
| 任务1 | 环境迁移到 SQLite（初始化 + 登录） | ✅ |
| 任务2 | 用户行为追踪（登录IP、登录时间） | ✅ |
| 文档任务 | 新建 Week06 README（完整过程说明） | ✅ |

---

## 启动与复现步骤（可直接照做）

### 1) 启动后端

```bash
cd week06/homework/gin-fullstack/server
go run main.go
```

### 2) 启动前端

```bash
cd week06/homework/gin-fullstack/web
npm install
npm run dev
```

### 3) 初始化 SQLite

1. 打开 `http://localhost:8080/#/init`；
2. 点击“我已确认”，进入初始化表单；
3. 数据库类型选择 `sqlite`；
4. 推荐参数：
   - `adminPassword`: `123456`（可自定义）
   - `dbName`: `gva`
   - `dbPath`: `.`
5. 点击“立即初始化”；
6. 初始化成功后，前往登录页 `http://localhost:8080/#/login`。

### 4) 功能验收主路径（老师视频检查路径）

1. 管理员登录；
2. 进入“用户管理”，新增用户 `a`；
3. 用第二浏览器登录用户 `a`；
4. 回到管理员页面刷新用户列表；
5. 验证用户 `a` 显示“登录IP”和“登录时间（YYYY-MM-DD HH:mm）”。

---

## 核心技术实现

### 1. SQLite 环境迁移（任务1）

- 配置文件：`server/config.yaml`
  - 将 `system.db-type` 从 `mysql` 改为 `sqlite`
- 初始化流程：
  - 前端初始化页提交到后端 `/init/initdb`
  - 后端执行 SQLite 初始化逻辑并写回配置

### 2. 用户最后登录信息（任务2）

#### 后端实现

- `server/model/system/sys_user.go`
  - 新增字段：`LastLoginIP`、`LastLoginTime`
- `server/service/system/sys_user.go`
  - 新增方法：`UpdateLastLoginInfo(id, ip, loginTime)`
- `server/api/v1/system/sys_user.go`
  - 在 `TokenNext` 登录成功路径写入最后登录 IP 和时间

#### 前端实现

- `web/src/view/superAdmin/user/user.vue`
  - 表格新增两列：`登录IP`、`登录时间`
  - 通过 `formatLoginTime()` 格式化为 `YYYY-MM-DD HH:mm`
  - 空值显示 `-`
  - 使用 `min-width` 保持列宽自适应风格

---

## 任务过程中的问题与修复记录（重点）

### 问题1：SQLite 初始化失败

- **现象**：初始化弹窗提示“自动创建数据库失败，请查看后台日志”
- **日志关键字**：`unable to open database file: out of memory (14)`
- **根因**：初始化表单里 `dbPath` 为空，后端拼出 `/gva.db`（根目录），无写权限导致创建失败
- **修复**：
  - 后端：`server/model/system/request/sys_init.go`
    - `dbPath` 为空时默认 `.`，并自动创建目录
  - 前端：`web/src/view/init/index.vue`
    - 选择 sqlite 时默认 `dbPath` 改为 `.`
- **结果**：初始化可正常创建 SQLite 数据库文件

### 问题2：登录后提示与真实错误不一致（排查记录）

- **现象**：前端可能看到“账户不存在/密码错误”，但真实原因是数据库未初始化
- **排查方式**：查看后端日志定位 `db not init`、`/init/checkdb`、`/init/initdb` 请求链路
- **处理结论**：先完成初始化，再进行登录；登录失败排查需以后端日志为准

### 问题3：前端/后端启动后入口不明确

- **现象**：只知道启动命令，不清楚初始化页地址
- **修复**：在 README 明确给出地址：
  - 初始化页：`http://localhost:8080/#/init`
  - 登录页：`http://localhost:8080/#/login`

---

## 常见环境问题排查

### Q1：前端能开，初始化报错

- 看后端控制台日志是否有 `unable to open database file`
- 确认初始化页 `dbPath` 为 `.` 或可写绝对路径

### Q2：点击“前往初始化”提示“已配置数据库信息，无法初始化”

- 说明系统判定已经初始化过
- 直接去登录页登录；若忘记密码，可删除已有 sqlite db 后重新初始化

### Q3：登录失败

- 先确认是否完成初始化
- 再确认管理员密码是否为初始化时设置的密码（默认一般为 `123456`）

---

## 提交与视频说明（按作业要求）

1. 视频开头需展示记事本并口播身份信息；
2. 视频重点演示任务1和任务2；
3. 时长建议 6-7 分钟；
4. 视频命名：`姓名_学号_Gin-fullstack.mp4`；
5. 代码目录：`week06/homework/gin-fullstack`。

