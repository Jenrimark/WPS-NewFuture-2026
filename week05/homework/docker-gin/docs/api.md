# API 接口文档

**统一前缀**：`/api`  
**Content-Type**：除「导出 CSV」外，请求/响应均为 `application/json; charset=utf-8`。

---

## 鉴权说明（全局）

| 类型 | 说明 |
|------|------|
| **公开接口** | 注册、登录：无需 Token。 |
| **受保护接口** | 其余所有业务接口必须在 Header 中携带：`Authorization: Bearer <token>`。 |
| **未携带 / Token 无效** | 统一返回 HTTP `401`，Body 中 `code` 多为 `UNAUTHORIZED`（见各接口错误码表）。 |

---

## 1. 用户注册

| 项 | 内容 |
|----|------|
| **路径** | `POST /api/register` |
| **鉴权** | 否 |
| **说明** | 创建用户；密码经 bcrypt 哈希后写入数据库，**不存明文**。 |

**Body（JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 长度 3～64 |
| `password` | string | 是 | 长度 6～128 |

**请求示例**

```json
{
  "username": "alice",
  "password": "12345678"
}
```

**成功** — HTTP `200`

```json
{
  "id": 1,
  "username": "alice"
}
```

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 400 | `BAD_REQUEST` | JSON 校验失败（长度、必填等） |
| 400 | `USER_EXISTS` | 用户名已存在 |
| 500 | `INTERNAL_ERROR` | 哈希等内部错误 |

---

## 2. 用户登录

| 项 | 内容 |
|----|------|
| **路径** | `POST /api/login` |
| **鉴权** | 否 |

**Body（JSON）**

| 字段 | 类型 | 必填 |
|------|------|------|
| `username` | string | 是 |
| `password` | string | 是 |

**成功** — HTTP `200`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 400 | `BAD_REQUEST` | 参数校验失败 |
| 401 | `INVALID_CREDENTIALS` | 用户名或密码错误 |
| 500 | `INTERNAL_ERROR` | 签发 JWT 失败等 |

---

## 3. 智能查询单词（不落库）

| 项 | 内容 |
|----|------|
| **路径** | `GET /api/words/query` |
| **鉴权** | 是 |

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `word` | string | 是 | 待查单词（trim 后不能为空） |
| `ai_provider` | string | 是 | `qwen`：阿里云 DashScope 兼容模式；`deepseek`：第二套 OpenAI 兼容线路（见 `.env` 可选段） |

**业务逻辑**

1. 若当前用户词本中**已存在**该词且未软删 → 返回数据库内容，`source=db`（**不写库**）。  
2. 否则调用对应 AI → 返回 JSON 结构释义 + 3 条例句，`source=ai`（**仍不写库**）。

**成功** — HTTP `200`（来自 AI 示例）

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

**成功** — 命中词本（`source=db`）时，`data` 额外包含 `id`、`notes`（学习备注，可能为空字符串）。

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 400 | `BAD_REQUEST` | 缺少 `word`/`ai_provider` 或 provider 非法 |
| 502 | `AI_ERROR` | 大模型 HTTP 或解析失败（`message` 为上游信息） |
| 500 | `INTERNAL_ERROR` | 数据库查询异常 |

---

## 4. 手动保存单词

| 项 | 内容 |
|----|------|
| **路径** | `POST /api/words` |
| **鉴权** | 是 |

**Body（JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `word` | string | 是 | 单词 |
| `meaning` | string | 是 | 释义 |
| `examples` | string[] | 是 | 至少 3 条例句 |
| `ai_provider` | string | 是 | 与查词时线路一致 |
| `note` | string | 否 | 学习备注，最长 2000 字符（UTF-8 字节长度校验） |

**成功** — HTTP `200`

```json
{ "id": 10 }
```

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 400 | `BAD_REQUEST` | JSON 绑定失败 |
| 400 | `DUPLICATE` | 同一用户已保存过该词（唯一约束） |
| 400 | `NOTE_TOO_LONG` | 备注超长 |
| 500 | `INTERNAL_ERROR` | 数据库错误 |

---

## 5. 获取单词列表（分页 + 关键词筛选）

| 项 | 内容 |
|----|------|
| **路径** | `GET /api/words` |
| **鉴权** | 是 |

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码，≥1 |
| `page_size` | int | 否 | 10 | 每页条数，1～50 |
| `q` | string | 否 | — | 子串筛选：仅保留 `word` 字段中包含该子串的记录（`LOCATE`，大小写依赖库排序规则） |

**成功** — HTTP `200`

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
      "notes": "易与 apply 混淆",
      "created_at": "2026-04-23T22:00:00+08:00"
    }
  ]
}
```

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 500 | `INTERNAL_ERROR` | 查询失败 |

---

## 6. 更新单词学习备注（扩展）

| 项 | 内容 |
|----|------|
| **路径** | `PATCH /api/words/:id/note` |
| **鉴权** | 是 |
| **说明** | `:id` 为 `words.id`；仅能修改**当前用户**且**未软删**的词。 |

**Path 参数**

| 参数 | 说明 |
|------|------|
| `id` | 单词记录 ID（无符号整数） |

**Body（JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `note` | string | 否 | 新备注；可传空字符串清空。最长 2000 字符（与保存接口一致）。 |

**请求示例**

```json
{ "note": "复习：注意可数名词用法" }
```

**成功** — HTTP `200`

```json
{ "ok": true }
```

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 400 | `BAD_REQUEST` | `id` 非法或 JSON 校验失败 |
| 400 | `NOTE_TOO_LONG` | 备注超长 |
| 404 | `NOT_FOUND` | 记录不存在或不属于当前用户 |
| 500 | `INTERNAL_ERROR` | 更新失败 |

---

## 7. 删除单词（软删除）

| 项 | 内容 |
|----|------|
| **路径** | `DELETE /api/words/:id` |
| **鉴权** | 是 |

**Path 参数**：`id` — 单词记录 ID。

**成功** — HTTP `200`

```json
{ "ok": true }
```

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 400 | `BAD_REQUEST` | `id` 非法 |
| 404 | `NOT_FOUND` | 记录不存在或不属于当前用户 |
| 500 | `INTERNAL_ERROR` | 删除失败 |

---

## 8. 学习统计摘要（扩展）

| 项 | 内容 |
|----|------|
| **路径** | `GET /api/stats/summary` |
| **鉴权** | 是 |
| **说明** | 基于当前用户**未软删**词本聚合；用于学习进度可视化或自查。 |

**成功** — HTTP `200`

```json
{
  "total_words": 42,
  "words_last_7_days": 5,
  "by_ai_provider": {
    "qwen": 40,
    "deepseek": 2
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `total_words` | int64 | 词本总条数 |
| `words_last_7_days` | int64 | 近 7 日（按服务器时间）新建条数 |
| `by_ai_provider` | object | 各 `ai_provider` 出现次数 |

**失败错误码**

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 500 | `INTERNAL_ERROR` | 统计查询失败 |

---

## 9. 导出词本为 CSV（扩展）

| 项 | 内容 |
|----|------|
| **路径** | `GET /api/words/export` |
| **鉴权** | 是 |
| **说明** | 导出当前用户未软删记录，**最多 5000 条**，按 `id` 倒序。响应为文件流，非 JSON。 |

**成功** — HTTP `200`  
**Header**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="wordbook.csv"`

**CSV 列顺序**

`word`, `meaning`, `examples_json`, `ai_provider`, `created_at`, `notes`

**失败** — 仍可能返回 JSON Body（便于排错）

| HTTP | `code` | 含义 |
|------|--------|------|
| 401 | `UNAUTHORIZED` | 未登录或 Token 无效 |
| 500 | `INTERNAL_ERROR` | `export failed` / `csv write failed` |

---

## 附录：通用 `message` 字段

除上述 `code` 外，响应体常含人类可读 `message`（尤其是 `BAD_REQUEST`、`AI_ERROR`），前端可直接展示给用户。
