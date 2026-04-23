# Gin 学生信息管理系统（CRUD）

使用 Gin 框架开发的学生信息管理接口，提供学生信息的增删改查（增：`POST /students`，删改查：`GET/PUT/DELETE /students/:id`，查询全部：`GET /students`）。

本项目按版本划分为 v1 / v2 / v3：

- v1：内存切片模拟数据库（服务重启后数据会丢失），路由前缀：无（如 `/students`）
- v2：SQLite + SQL 构造器（避免手写原始 SQL 字符串），路由前缀：`/2`（如 `/2/students`）
- v3：MySQL + GORM，路由前缀：`/3`（如 `/3/students`）
- v4：MySQL + GORM + Redis 缓存（仅对“查询”做缓存），路由前缀：`/4`（如 `/4/students`）

## 项目结构

- `main.go`：Gin 引擎初始化、注册路由并启动服务
- `models/student.go`：`Student` 结构体定义
- `routes/student.go`：学生相关路由注册
- `controllers/student.go`：具体请求处理逻辑（绑定 JSON、查找/更新/删除、返回结果）
- `db/`：数据库连接相关代码（SQLite / MySQL(GORM)）
- `db/redis.go`：Redis 连接（供 v4 使用）
- `routes/v2/`、`controllers/v2/`：v2 版本路由与控制器
- `routes/v3/`、`controllers/v3/`：v3 版本路由与控制器
- `routes/v4/`、`controllers/v4/`：v4 版本路由与控制器（Redis 缓存）

## 启动方式

在 `week03/practice/gin/` 目录下运行：

```bash
go run .
```

启动后服务地址：

`http://localhost:8080`

## v2-v4 逐步运行过程（建议按此顺序截图证明）

下面给你一套**可直接照着执行**的步骤，用来分别证明 v2 / v3 / v4 运行正常（含建议截图点）。

> 建议准备两个终端窗口：
>
> - 终端 A：启动服务（观察控制台日志，截图用）
> - 终端 B：执行 curl 测试命令（观察返回 JSON，截图用）

### 0. 进入项目目录

```bash
cd week03/practice/gin
```

### 1. 验证 v2（SQLite）可运行并截图

#### 1.1 启动服务（终端 A）

```bash
go run .
```

建议截图点（任意一个即可）：

- 启动日志中包含 `学生信息管理系统启动: http://localhost:8080`
- 出现类似 `[db] sqlite connected: data/students.db` 的日志（首次运行会自动创建 `./data/students.db` 并建表）

#### 1.2 用 v2 路由验证 CRUD（终端 B）

1) v2 创建（`POST /2/students`）

```bash
curl -X POST http://localhost:8080/2/students \
  -H "Content-Type: application/json" \
  -d '{"id":2001,"name":"v2-张三","age":20,"grade":"2024级"}'
```

2) v2 查询全部（`GET /2/students`）

```bash
curl http://localhost:8080/2/students
```

3) v2 查询单个（`GET /2/students/:id`）

```bash
curl http://localhost:8080/2/students/2001
```

4) v2 更新（`PUT /2/students/:id`）

```bash
curl -X PUT http://localhost:8080/2/students/2001 \
  -H "Content-Type: application/json" \
  -d '{"id":2001,"name":"v2-李四","age":21,"grade":"2024级"}'
```

5) v2 删除（`DELETE /2/students/:id`）

```bash
curl -X DELETE http://localhost:8080/2/students/2001
```

建议截图点：

- 终端 B 的 JSON 返回（例如创建成功、查询列表包含数据等）
- 终端 A 对应的 v2 日志（如 `[v2][GET /2/students] ...`）

---

### 2. 准备 MySQL（用于 v3 / v4）

你可以用 Docker 快速拉起 MySQL（推荐，方便截图）。

#### 2.1 启动 MySQL（终端 C，可选）

```bash
docker run --name mysql-students \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=students \
  -p 3306:3306 \
  -d mysql:8
```

等待 10～30 秒让 MySQL 完全起来（首次启动会慢一些）。

#### 2.2 设置 `MYSQL_DSN`（终端 A 或 B）

```bash
export MYSQL_DSN='root:password@tcp(127.0.0.1:3306)/students?charset=utf8mb4&parseTime=True&loc=Local'
```

> 说明：本项目在启动时会对 `models.Student` 执行 `AutoMigrate`，所以**你不需要手动建表**。

---

### 3. 验证 v3（MySQL + GORM）可运行并截图

#### 3.1 重启服务（终端 A）

如果你已经在跑服务，先 `Ctrl + C` 停掉，再重新运行：

```bash
go run .
```

建议截图点：

- 控制台没有 `mysql init failed` 报错
- 出现类似 `[db] mysql connected (gorm)` 的日志

#### 3.2 用 v3 路由验证 CRUD（终端 B）

1) v3 创建

```bash
curl -X POST http://localhost:8080/3/students \
  -H "Content-Type: application/json" \
  -d '{"id":3001,"name":"v3-张三","age":20,"grade":"2024级"}'
```

2) v3 查询全部

```bash
curl http://localhost:8080/3/students
```

3) v3 查询单个

```bash
curl http://localhost:8080/3/students/3001
```

4) v3 更新

```bash
curl -X PUT http://localhost:8080/3/students/3001 \
  -H "Content-Type: application/json" \
  -d '{"id":3001,"name":"v3-李四","age":21,"grade":"2024级"}'
```

5) v3 删除

```bash
curl -X DELETE http://localhost:8080/3/students/3001
```

建议截图点：

- v3 的创建/查询返回
- 终端 A 中出现 `[gorm] ...` 或 `[v3][GET /3/students] ...` 等日志

---

### 4. 准备 Redis（用于 v4 缓存）

同样推荐用 Docker 启动 Redis。

#### 4.1 启动 Redis（终端 D，可选）

```bash
docker run --name redis-students -p 6379:6379 -d redis:7-alpine
```

#### 4.2（可选）设置 Redis 环境变量

不设置也能跑（默认 `127.0.0.1:6379`）。如果你想显式写清楚，便于截图：

```bash
export REDIS_ADDR='127.0.0.1:6379'
export REDIS_DB='0'
```

---

### 5. 验证 v4（MySQL + GORM + Redis 缓存）可运行并截图

#### 5.1 重启服务（终端 A）

如果你已经在跑服务，先 `Ctrl + C` 停掉，再重新运行：

```bash
go run .
```

建议截图点（越全越好）：

- `[db] mysql connected (gorm)`
- `[db] redis connected: 127.0.0.1:6379 db=0`

> 重要：如果 Redis 连接失败，v4 路由不会注册。你会看到类似 `redis init failed (v4 routes will be disabled)` 的提示。

#### 5.2 用 v4 路由验证 CRUD（终端 B）

1) v4 创建（会清理缓存）

```bash
curl -X POST http://localhost:8080/4/students \
  -H "Content-Type: application/json" \
  -d '{"id":4001,"name":"v4-张三","age":20,"grade":"2024级"}'
```

2) v4 查询全部（第一次通常是缓存未命中，会回填缓存）

```bash
curl http://localhost:8080/4/students
```

3) v4 再查询全部（这次应当是缓存命中）

```bash
curl http://localhost:8080/4/students
```

4) v4 查询单个（第一次通常未命中）

```bash
curl http://localhost:8080/4/students/4001
```

5) v4 再查询单个（这次应当是缓存命中）

```bash
curl http://localhost:8080/4/students/4001
```

建议截图点（用于证明“用了 Redis 缓存”）：

- 终端 A 的日志里会出现：
  - `[v4][GET /4/students] cache miss ...` 和下一次的 `cache hit ...`
  - `[v4][GET /4/students/4001] cache miss ...` 和下一次的 `cache hit ...`

#### 5.3 证明“增改删后清缓存”（终端 B + 终端 A）

1) 更新（会清理缓存）

```bash
curl -X PUT http://localhost:8080/4/students/4001 \
  -H "Content-Type: application/json" \
  -d '{"id":4001,"name":"v4-李四","age":22,"grade":"2024级"}'
```

2) 更新后立刻查询单个（第一次会重新走 DB 并回填缓存，日志应是 cache miss）

```bash
curl http://localhost:8080/4/students/4001
```

3) 再查一次（cache hit）

```bash
curl http://localhost:8080/4/students/4001
```

建议截图点：

- 更新返回 JSON（终端 B）
- 更新后第一次查询出现 `cache miss`，第二次查询出现 `cache hit`（终端 A）

---

### 6.（可选）停止并清理 Docker 容器

```bash
docker rm -f mysql-students redis-students
```

### v2 (SQLite) 说明

- 默认数据库文件：`./data/students.db`（会自动创建并建表）
- 路由前缀：`/2`，例如：
  - `POST /2/students`
  - `GET /2/students`
  - `GET /2/students/:id`
  - `PUT /2/students/:id`
  - `DELETE /2/students/:id`

### v3 (MySQL + GORM) 说明

v3 需要设置 MySQL 连接字符串环境变量 `MYSQL_DSN`，未设置时服务仍会启动，但 **v3 路由不会注册**（控制台会提示原因）。

`MYSQL_DSN` 示例：

```bash
export MYSQL_DSN='root:password@tcp(127.0.0.1:3306)/students?charset=utf8mb4&parseTime=True&loc=Local'
go run .
```

启动后 v3 路由前缀为 `/3`，例如：

- `POST /3/students`
- `GET /3/students`
- `GET /3/students/:id`
- `PUT /3/students/:id`
- `DELETE /3/students/:id`

### v4 (MySQL + GORM + Redis 缓存) 说明

v4 在 v3 的基础上，为“查询接口”增加 Redis 缓存：

- 缓存范围：
  - `GET /4/students`（缓存学生列表）
  - `GET /4/students/:id`（缓存单个学生）
- 过期时间：默认 **5 分钟**
- 一致性策略：`POST/PUT/DELETE` 成功后会清理相关缓存（单个 key + 列表 key）

Redis 连接可通过环境变量配置（不设置时默认连接 `127.0.0.1:6379`）。未能连接 Redis 时服务仍会启动，但 **v4 路由不会注册**。

环境变量：

- `REDIS_ADDR`：如 `127.0.0.1:6379`
- `REDIS_PASSWORD`：如有密码则设置
- `REDIS_DB`：如 `0`

## API 说明

### 1. 创建学生

- 路由：`POST /students`
- 请求体（JSON）：

```json
{
  "id": 1,
  "name": "张三",
  "age": 20,
  "grade": "2024级"
}
```

- 成功响应：`201 Created`

```json
{
  "message": "学生创建成功",
  "student": {
    "id": 1,
    "name": "张三",
    "age": 20,
    "grade": "2024级"
  }
}
```

- 常见错误：
  - `400 Bad Request`：JSON 解析失败或 `id` 非正整数

### 2. 获取所有学生

- 路由：`GET /students`
- 成功响应：`200 OK`
- 返回值：学生列表（可能为空数组 `[]`）

```json
[
  {
    "id": 1,
    "name": "张三",
    "age": 20,
    "grade": "2024级"
  }
]
```

### 3. 获取单个学生

- 路由：`GET /students/:id`
- 成功响应：`200 OK`（返回找到的学生对象）
- 未找到：`404 Not Found`

错误响应示例：

```json
{ "message": "学生不存在" }
```

### 4. 更新学生

- 路由：`PUT /students/:id`
- 请求体（JSON）：更新后的完整学生信息（URL 中的 `id` 会覆盖 body 中的 `id`，保证一致）
- 成功响应：`200 OK`

```json
{
  "message": "学生更新成功",
  "student": {
    "id": 1,
    "name": "李四",
    "age": 21,
    "grade": "2024级"
  }
}
```

- 常见错误：
  - `400 Bad Request`：`id` 非正整数或 JSON 解析失败
  - `404 Not Found`：指定 `id` 的学生不存在

### 5. 删除学生

- 路由：`DELETE /students/:id`
- 成功响应：`200 OK`

```json
{ "message": "学生删除成功" }
```

- 未找到：`404 Not Found`

## curl 测试示例

1) v1 创建

```bash
curl -X POST http://localhost:8080/students \
  -H "Content-Type: application/json" \
  -d '{"id":1,"name":"张三","age":20,"grade":"2024级"}'
```

2) v1 获取所有

```bash
curl http://localhost:8080/students
```

3) v1 获取单个

```bash
curl http://localhost:8080/students/1
```

4) v1 更新

```bash
curl -X PUT http://localhost:8080/students/1 \
  -H "Content-Type: application/json" \
  -d '{"id":1,"name":"李四","age":21,"grade":"2024级"}'
```

5) v1 删除

```bash
curl -X DELETE http://localhost:8080/students/1
```

## 控制台日志

每个关键操作（绑定失败、创建成功、查询结果、更新/删除是否命中）都会在控制台打印，便于你调试和观察运行情况。

