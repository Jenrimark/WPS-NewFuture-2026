# 数据库设计文档

数据库：MySQL 8.0  
初始化方式：`docs/init.sql` 挂载到 MySQL 容器的 `/docker-entrypoint-initdb.d/`，**严禁**在代码中 `AutoMigrate` 自动建表。

## 1. 表：`users`

用途：存储用户账号信息（密码只存 Hash）。

| 字段名 | 类型 | 约束/索引 | 含义 |
| --- | --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | PK，自增 | 用户 ID |
| `username` | `VARCHAR(64)` | 唯一索引 `uk_users_username` | 登录名 |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt hash |
| `created_at` | `DATETIME(3)` | | 创建时间 |
| `updated_at` | `DATETIME(3)` | | 更新时间 |

## 2. 表：`words`

用途：存储用户的单词本记录。每条记录与 `users.id` 关联，并支持软删除。

| 字段名 | 类型 | 约束/索引 | 含义 |
| --- | --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | PK，自增 | 记录 ID |
| `user_id` | `BIGINT UNSIGNED` | 外键 `fk_words_user`，索引 `idx_words_user_id` | 所属用户 |
| `word` | `VARCHAR(128)` | 与 `user_id` 组成唯一索引 `uk_words_user_word` | 单词本体 |
| `meaning` | `TEXT` | NOT NULL | 释义（中文） |
| `examples_json` | `JSON` | NOT NULL | 3 条例句（JSON 数组） |
| `ai_provider` | `VARCHAR(32)` | NOT NULL | AI 来源（deepseek/qwen） |
| `created_at` | `DATETIME(3)` | | 创建时间 |
| `updated_at` | `DATETIME(3)` | | 更新时间 |
| `deleted_at` | `DATETIME(3)` | 索引 `idx_words_deleted_at` | 软删除时间 |

## 3. 关联关系说明

- `users (1) -> (N) words`：一个用户可以保存多条单词记录。
- 删除单词采用软删除：仅更新 `words.deleted_at`，列表与查询均过滤 `deleted_at IS NULL`。

## 4. 旧库结构对齐（非 AutoMigrate）

历史版本曾在 `words` 表上包含 `notes` 列；当前 `init.sql` 已移除该列。后端在 MySQL 连接成功后执行 `pkg/db/migrate.go` 中的幂等迁移：若检测到 `words.notes` 仍存在则执行 `ALTER TABLE words DROP COLUMN notes`，否则跳过。无需手工执行 SQL；若需离线处理，可对 `wordapp` 库自行执行同一条 `DROP COLUMN`（列已不存在时 MySQL 会报错，请先查 `information_schema.COLUMNS`）。
