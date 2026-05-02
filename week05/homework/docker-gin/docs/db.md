# 数据库设计文档

**数据库**：MySQL 8.0（Docker 服务名 `db`）  
**字符集 / 排序规则**：表级 `utf8mb4` + `utf8mb4_0900_ai_ci`  
**初始化方式**：`docs/init.sql` 挂载到容器 `/docker-entrypoint-initdb.d/`，**严禁**在应用代码中使用 GORM `AutoMigrate` 自动建表（符合课程与企业规范）。

---

## 1. 表 `users`（用户）

**业务含义**：存储可登录用户；密码仅存 **bcrypt 哈希**，无明文。

| 字段名 | 数据类型 | 主键 | 外键 | 索引 | 业务含义 |
|--------|----------|------|------|------|----------|
| `id` | `BIGINT UNSIGNED` | 是（自增） | — | 聚簇主键 | 用户唯一标识，被 `words.user_id` 引用 |
| `username` | `VARCHAR(64)` | 否 | — | **唯一** `uk_users_username` | 登录名，全局不重复 |
| `password_hash` | `VARCHAR(255)` | 否 | — | — | bcrypt 生成的密码摘要 |
| `created_at` | `DATETIME(3)` | 否 | — | — | 注册时间 |
| `updated_at` | `DATETIME(3)` | 否 | — | — | 记录更新时间（ORM 维护） |

---

## 2. 表 `words`（用户单词本）

**业务含义**：每个用户维护自己的词条；同一用户对同一单词**仅允许一条未删除记录**（唯一约束）。支持**软删除**与**学习备注**（课程扩展）。

| 字段名 | 数据类型 | 主键 | 外键 | 索引 | 业务含义 |
|--------|----------|------|------|------|----------|
| `id` | `BIGINT UNSIGNED` | 是（自增） | — | 聚簇主键 | 词条记录 ID，API 中 `:id` 多指本列 |
| `user_id` | `BIGINT UNSIGNED` | 否 | **是** → `users(id)` | 普通索引 `idx_words_user_id` | 词条所属用户 |
| `word` | `VARCHAR(128)` | 否 | — | 与 `user_id` 组成 **唯一** `uk_words_user_word` | 英文单词（或短语）本体 |
| `meaning` | `TEXT` | 否 | — | — | 中文释义（展示与复习用） |
| `examples_json` | `JSON` | 否 | — | — | 固定为 JSON 数组，存 **3 条**英文例句（与作业要求一致） |
| `ai_provider` | `VARCHAR(32)` | 否 | — | — | 生成该条释义/例句时选用的线路标识（如 `qwen`、`deepseek`） |
| `notes` | `TEXT` | 否 | — | — | **扩展**：用户自定义学习备注（易错点、联想记忆等），允许 `NULL` 或空串 |
| `created_at` | `DATETIME(3)` | 否 | — | — | 首次保存到词本的时间 |
| `updated_at` | `DATETIME(3)` | 否 | — | — | 记录最后更新时间（含备注修改） |
| `deleted_at` | `DATETIME(3)` | 否 | — | 普通索引 `idx_words_deleted_at` | **软删除**：非空表示已删；列表与统计均过滤 `IS NULL` |

---

## 3. 用户表与单词表的关联关系

- **基数**：`users` **1 : N** `words`（一名用户对应多条词本记录）。  
- **参照完整性**：`words.user_id` **外键**引用 `users.id`（`fk_words_user`），防止悬挂词本。  
- **业务唯一性**：`UNIQUE (user_id, word)` 保证同一用户不会重复保存同一单词（未删除前提下）。  
- **删除策略**：对用户「删除单词」操作采用 **软删除**（写 `deleted_at`），便于审计与误删恢复空间；**不级联物理删除用户**（课程范围以词本为主，用户删除策略可按产品后续扩展）。

---

## 4. 扩展功能与表结构的关系（给老师说明）

| 功能 | 依赖字段 / 表 | 说明 |
|------|----------------|------|
| 词本关键词筛选 | `words.word` | API `GET /api/words?q=` 使用 `LOCATE` 子串匹配 |
| 学习备注 | `words.notes` | 保存时可写 `note`；亦可 `PATCH` 单独更新 |
| 学习统计 | `words` 聚合 | `COUNT(*)`、`created_at` 时间窗、`GROUP BY ai_provider` |
| CSV 导出 | `words` 全列（未软删） | 扁平导出便于 Excel / 打印复习 |

以上扩展**不引入** AutoMigrate，仍由 `init.sql` 版本化管理表结构。
