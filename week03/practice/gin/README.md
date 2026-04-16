# Gin 学生信息管理系统（CRUD）

使用 Gin 框架开发的学生信息管理接口，提供学生信息的增删改查（增：`POST /students`，删改查：`GET/PUT/DELETE /students/:id`，查询全部：`GET /students`）。

> 数据存储说明：使用内存切片模拟数据库（服务重启后数据会丢失）。

## 项目结构

- `main.go`：Gin 引擎初始化、注册路由并启动服务
- `models/student.go`：`Student` 结构体定义
- `routes/student.go`：学生相关路由注册
- `controllers/student.go`：具体请求处理逻辑（绑定 JSON、查找/更新/删除、返回结果）

## 启动方式

在 `week03/practice/gin/` 目录下运行：

```bash
go run .
```

启动后服务地址：

`http://localhost:8080`

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

1) 创建

```bash
curl -X POST http://localhost:8080/students \
  -H "Content-Type: application/json" \
  -d '{"id":1,"name":"张三","age":20,"grade":"2024级"}'
```

2) 获取所有

```bash
curl http://localhost:8080/students
```

3) 获取单个

```bash
curl http://localhost:8080/students/1
```

4) 更新

```bash
curl -X PUT http://localhost:8080/students/1 \
  -H "Content-Type: application/json" \
  -d '{"id":1,"name":"李四","age":21,"grade":"2024级"}'
```

5) 删除

```bash
curl -X DELETE http://localhost:8080/students/1
```

## 控制台日志

每个关键操作（绑定失败、创建成功、查询结果、更新/删除是否命中）都会在控制台打印，便于你调试和观察运行情况。

