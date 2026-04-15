# 服务健康探测器（monitor）— Week05 作业

本项目是一个高并发 CLI 健康探测工具，支持 HTTP/TCP 探测、失败重试、超时控制、结果汇总与报表输出。  
项目实现已对齐 `week05/homework/作业要求.md`，并支持老师要求的运行方式：`go run .`

---

## 项目基本信息

| 字段 | 内容 |
|------|------|
| 姓名 | 吴汉东 |
| 学校 | 中国地质大学（武汉） |
| 学号 | 20231003912 |
| 代码目录 | `week05/homework/monitor` |
| Go 版本 | `1.23` |
| 运行入口 | `main.go`（根目录） |
| 默认配置 | `config.json` |
| 报表输出 | 项目根目录 `monitor-log-YYYYMMDDHHMMSS.log` |

---

## 作业要求对照清单（验收视角）

| # | 作业要求 | 当前实现 | 状态 |
|---|---|---|---|
| 1 | JSON 外部配置定义目标 | `internal/config` 读取并校验 `targets` | ✅ |
| 2 | 识别不同协议（HTTP/TCP） | `internal/probe` 按地址协议分流 | ✅ |
| 3 | 高并发探测 | 每个目标单独 goroutine 并发执行 | ✅ |
| 4 | 超时机制 | 每次尝试使用 `context.WithTimeout` | ✅ |
| 5 | 并发安全汇总 | `WaitGroup + buffered channel` 聚合结果 | ✅ |
| 6 | `retry_count` 可选且 `<=3` | 配置校验 + 失败重试（最多 1+retry_count 次） | ✅ |
| 7 | CLI 参数 | 支持 `--config`、`--timeout`、`-v` | ✅ |
| 8 | 智能报表 | 成功率、时延分布、最慢目标、明细表 | ✅ |
| 9 | 执行后生成日志文件 | 根目录输出 `monitor-log-*.log` | ✅ |
| 10 | 人为加入 `time.Sleep(1s)` 展示并发 | 每次探测前固定 `sleep 1s` | ✅ |
| 11 | 单元测试 | `config/probe/report` 均有测试 | ✅ |
| 12 | 运行方式 `go run .` | 根目录 `main.go` 已支持 | ✅ |

---

## 目录结构与职责

```text
week05/homework/monitor/
├── main.go                         # 入口（支持 go run .）
├── config.json                     # 作业要求目标池
├── go.mod
├── README.md
└── internal/
    ├── app/
    │   └── app.go                  # CLI 参数解析 + 流程编排
    ├── config/
    │   ├── config.go               # 配置读取与校验
    │   └── config_test.go
    ├── probe/
    │   ├── probe.go                # 并发探测、协议执行、重试、超时
    │   └── probe_test.go
    └── report/
        ├── report.go               # 统计分析、报表生成与写文件
        └── report_test.go
```

### 为什么使用 `internal`

- 业务逻辑与入口解耦，`main.go` 保持轻量；
- 模块职责清晰，便于维护和扩展（新增协议/新报表格式）；
- 单测粒度更清晰，定位问题更快；
- Go 语义上限制外部误用（`internal` 包不可被仓库外直接引用）。

---

## 功能说明

### 1) 目标配置

`config.json` 每个目标字段：

- `name`：服务名称
- `address`：探测地址（HTTP URL 或 TCP 地址）
- `expectation`：期望结果（如 `200 OK`、`Connected`、`Fail`、`Contains "Go"`）
- `retry_count`（可选）：失败重试次数，范围 `0~3`

### 2) 探测协议与判定规则

- HTTP：
  - `200 OK`：匹配状态行；
  - `Contains "xxx"`：读取响应体并检查关键字；
  - `Fail`：请求失败才判成功。
- TCP：
  - 连接成功返回 `Connected`；
  - `Fail`：连接失败才判成功。

### 3) 并发、超时与重试

- 每个目标并发执行；
- 每次尝试前固定 `time.Sleep(1 * time.Second)`（作业要求）；
- 单次尝试使用超时上下文；
- 重试策略：总尝试次数 = `1 + retry_count`。

### 4) 报表输出内容

终端与日志文件输出包含：

- 总数、成功数、失败数、成功率；
- 平均时延；
- 时延分桶分布；
- 最慢目标；
- 全量目标明细（协议、结果、尝试次数、耗时、状态、期望、错误信息）。

---

## 快速开始

### 1) 运行程序（老师验收方式）

```bash
cd week05/homework/monitor
go run . --config config.json --timeout 3 -v
```

参数说明：

- `--config`：配置文件路径，默认 `config.json`
- `--timeout`：单次探测超时秒数，默认 `3`
- `-v`：详细模式，实时打印每个目标探测状态

### 2) 运行单元测试

```bash
cd week05/homework/monitor
go test ./...
```

### 3) 查看生成日志

程序执行后会在根目录生成：

`monitor-log-YYYYMMDDHHMMSS.log`

---

## 运行与验收步骤

### 1) 环境准备

- 进入项目目录：`cd week05/homework/monitor`
- 确认 Go 版本：`go version`（建议 `1.23`）

### 2) 执行程序（按作业要求）

```bash
cd week05/homework/monitor
go run . --config config.json --timeout 3 -v
```

执行后将完成以下动作：

- 并发探测所有配置目标；
- 终端打印实时探测状态（`-v`）；
- 输出汇总报表；
- 在根目录生成日志文件：`monitor-log-YYYYMMDDHHMMSS.log`。

### 3) 执行单元测试

```bash
cd week05/homework/monitor
go test ./...
```

测试覆盖内容：

- 配置校验（含 `retry_count` 边界）；
- 配置加载（合法 JSON / 非法 JSON）；
- 重试逻辑（失败后重试直至成功/结束）；
- 并发探测结果汇总数量一致性；
- 协议识别与 `Contains` 关键字解析；
- CLI 参数解析（默认值、参数覆盖、超时校验）；
- 报表统计字段与格式输出。

---

## 运行现象说明

在某些网络环境下，公网目标可能出现：

- `Forbidden`
- `context deadline exceeded`

这通常与网络出口策略、站点风控、访问限制有关，不代表程序逻辑错误。  
健康探测器的职责是：并发执行、记录结果、明确失败原因、输出分析报表；当前实现已满足这些工程目标。

---

## 最近验证结论（2026-04-15）

- `go test ./...`：通过 ✅（`app/config/probe/report` 包测试均为 `ok`；`main` 包无测试文件属正常现象）
- `go run . --config config.json --timeout 3 -v`：可用 ✅（成功执行并输出实时探测日志与汇总报表）
- 报表日志输出：可用 ✅（已生成 `monitor-log-20260415234753.log`）
- 作业要求条目：已全部覆盖 ✅

> 说明：执行环境对部分公网站点返回 `Forbidden` 或超时，这是网络环境差异导致的探测结果，不影响程序功能验收（并发、重试、超时、统计与日志落盘均正常）。
