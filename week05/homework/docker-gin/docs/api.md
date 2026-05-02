# API 文档

统一前缀：`/api`

鉴权：除注册/登录外，其余接口必须携带 Header：

- `Authorization: Bearer <token>`

## 1. 用户注册

- **路径**：`POST /api/register`
- **鉴权**：否
- **Body(JSON)**：

```json
{
  "username": "alice",
  "password": "123456"
}
```

- **成功返回**：

```json
{
  "id": 1,
  "username": "alice"
}
```

- **失败错误码**：
  - `BAD_REQUEST`：参数校验失败
  - `USER_EXISTS`：用户名已存在

## 2. 用户登录

- **路径**：`POST /api/login`
- **鉴权**：否
- **Body(JSON)**：

```json
{
  "username": "alice",
  "password": "123456"
}
```

- **成功返回**：

```json
{
  "token": "xxxxx.yyyyy.zzzzz"
}
```

- **失败错误码**：
  - `BAD_REQUEST`：参数校验失败
  - `INVALID_CREDENTIALS`：用户名或密码错误

## 3. 智能查询单词（不落库）

- **路径**：`GET /api/words/query`
- **鉴权**：是
- **Query**：
  - `word`：单词（必填）
  - `ai_provider`：`qwen`（阿里云 DashScope OpenAI 兼容模式）或 `deepseek`（第二套 OpenAI 兼容线路，对应 `.env` 中可选 `DEEPSEEK_*` 变量段）（必填）

- **逻辑**：
  - 若该用户已保存过该单词且未删除，直接返回数据库结果（`source=db`）
  - 否则调用 AI 返回结果（`source=ai`），不写库

- **成功返回**：

```json
{
  "source": "ai",
  "data": {
    "word": "apple",
    "meaning": "苹果；苹果树；苹果公司（语境）",
    "examples": [
      "I eat an apple every day.",
      "The apple fell from the tree.",
      "Apple released a new device this year."
    ],
    "ai_provider": "qwen"
  }
}
```

- **失败错误码**：
  - `UNAUTHORIZED`：未登录/Token 无效
  - `BAD_REQUEST`：缺少参数或 provider 非法
  - `AI_ERROR`：AI 调用失败

## 4. 手动保存单词

- **路径**：`POST /api/words`
- **鉴权**：是
- **Body(JSON)**：

```json
{
  "word": "apple",
  "meaning": "苹果",
  "examples": ["...", "...", "..."],
  "ai_provider": "qwen"
}
```

- **成功返回**：

```json
{ "id": 10 }
```

- **失败错误码**：
  - `UNAUTHORIZED`
  - `BAD_REQUEST`
  - `DUPLICATE`：同一用户重复保存同一个单词

## 5. 获取单词列表（分页）

- **路径**：`GET /api/words`
- **鉴权**：是
- **Query**：
  - `page`：默认 1
  - `page_size`：默认 10，最大 50

- **成功返回**：

```json
{
  "page": 1,
  "page_size": 10,
  "total": 2,
  "items": [
    {
      "id": 10,
      "word": "apple",
      "meaning": "苹果",
      "examples": ["...", "...", "..."],
      "ai_provider": "qwen",
      "created_at": "2026-04-23T22:00:00Z"
    }
  ]
}
```

- **失败错误码**：
  - `UNAUTHORIZED`
  - `INTERNAL_ERROR`

## 6. 删除单词（软删除）

- **路径**：`DELETE /api/words/:id`
- **鉴权**：是

- **成功返回**：

```json
{ "ok": true }
```

- **失败错误码**：
  - `UNAUTHORIZED`
  - `BAD_REQUEST`：id 非法
  - `NOT_FOUND`：记录不存在或不属于当前用户
