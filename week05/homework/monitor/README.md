# 服务健康探测器（monitor）— Week05 作业

## 项目基本信息

| 字段 | 内容 |
|------|------|
| 姓名 | 吴汉东 |
| 学校 | 中国地质大学（武汉） |
| 学号 | 20231003912 |
| 项目 | 服务健康探测器（高并发 CLI + 智能报表） |
| 项目名称 | 服务健康探测器（CLI） |
| 代码目录 | `week05/homework/monitor` |
| 语言与版本 | Go `1.23` |
| 运行入口 | `cmd/monitor/main.go` |
| 默认配置 | `config.json` |
| 输出目录 | `reports/` |
| 文档目录 | `docs/` |

---

## 开发任务索引（对照作业要求）

| # | 要求摘要 | 实现说明 | 状态 |
|---|----------|----------|------|
| 1 | 配置文件定义监控目标（JSON） | `internal/config` 解析 `targets` 并做字段校验 | ✅ |
| 2 | 自动识别探测协议（HTTP/TCP） | `internal/probe` 通过地址前缀识别协议并路由执行 | ✅ |
| 3 | 高并发探测 | 每个目标独立 goroutine，同步启动 | ✅ |
| 4 | 超时控制，防止阻塞 | 单目标 `context.WithTimeout` 控制超时 | ✅ |
| 5 | 结果安全聚合，无竞态 | `WaitGroup + buffered channel` 汇总结果 | ✅ |
| 6 | 支持失败重试 `retry_count`（<=3） | 配置校验限制范围，失败按次数重试 | ✅ |
| 7 | 命令行参数支持 | `--config`、`--timeout`、`-v` | ✅ |
| 8 | 智能报表：成功率、时延分布、最慢服务 | `internal/report` 聚合统计并输出文本报告 | ✅ |
| 9 | 运行后生成日志文件 | 自动写入 `reports/monitor-log-*.log` | ✅ |
| 10 | 并发性能展示加入 `time.Sleep(1s)` | 每次探测执行前固定睡眠 1 秒 | ✅ |
| 11 | 单元测试 | `internal/config`、`internal/probe`、`internal/report` 测试已覆盖 | ✅ |

---

## 需求分析

本项目核心目标不是“逐个检查地址是否可达”，而是构建一个可工程化复用的并发健康探测框架：

1. 输入层：通过配置文件批量定义目标，不把探测逻辑写死在代码中。  
2. 执行层：面向不同协议抽象探测执行器，统一在并发引擎下调度。  
3. 控制层：每个任务具备超时与重试能力，避免单点慢请求拖垮全局。  
4. 输出层：对技术决策有帮助的统计报表，而不是仅输出“成功/失败”。  

---

## 详细设计

### 1) 分层结构

- `cmd/monitor`：程序入口，负责启动应用。
- `internal/app`：参数解析、流程编排、标准输出和错误输出控制。
- `internal/config`：配置读取和合法性校验。
- `internal/probe`：并发探测、协议分发、重试与超时。
- `internal/report`：统计聚合、报告生成、文件落盘。

### 2) 执行流程

1. 解析 CLI 参数（`--config`、`--timeout`、`-v`）。
2. 加载并校验配置文件（检查空字段和重试范围）。
3. 并发启动每个目标探测任务。
4. 每个任务执行步骤：
   - 固定 `time.Sleep(1s)`（满足作业要求，便于展示并发）
   - 按协议执行 HTTP 或 TCP 探测
   - 失败时按 `retry_count` 重试
   - 单次尝试受 `timeout` 控制
5. 聚合所有结果，计算统计指标。
6. 输出报告到终端，并写入 `reports/monitor-log-*.log`。

### 3) 协议与期望判断

HTTP 探测规则：
- 当 `expectation` 类似 `200 OK`：匹配响应状态行。
- 当 `expectation` 为 `Contains "xxx"`：读取响应体并校验关键字。
- 当 `expectation` 为 `Fail`：期望请求失败（若成功返回则判失败）。

TCP 探测规则：
- 建连成功即 `Connected`。
- `expectation = Fail` 时，连接失败才算成功。

### 4) 并发与数据一致性设计

- 每个目标 1 个 goroutine，最大化并发吞吐。
- 主流程用 `WaitGroup` 等待所有协程结束，保证“先完成再汇总”。
- 结果通过 channel 回传，避免共享切片并发写入导致竞态。

### 5) 报表设计

报告包含以下关键维度：

- 总目标数、成功数、失败数、成功率
- 平均时延
- 时延分桶（`<100ms`、`100ms-500ms`、`500ms-1s`、`1s-3s`、`>3s`）
- 最慢目标详情
- 每个目标的明细（协议、成功状态、尝试次数、耗时、错误）

---

## 代码结构

```text
week05/homework/monitor/
├── cmd/
│   └── monitor/
│       └── main.go                # CLI 入口
├── internal/
│   ├── app/
│   │   └── app.go                 # 参数解析 + 总流程编排
│   ├── config/
│   │   ├── config.go              # 配置加载与校验
│   │   └── config_test.go
│   ├── probe/
│   │   ├── probe.go               # 并发探测引擎
│   │   └── probe_test.go
│   └── report/
│       ├── report.go              # 报表生成与落盘
│       └── report_test.go
├── docs/
│   └── TEST_RESULTS.md            # 测试记录
├── reports/                       # 运行输出目录
├── config.json                    # 题目要求的目标配置
├── go.mod
└── README.md
```

---

## 使用说明

### 1) 运行程序

```bash
cd week05/homework/monitor
go run ./cmd/monitor --config config.json --timeout 3 -v
```

参数说明：
- `--config`：配置文件路径，默认 `config.json`
- `--timeout`：单次探测超时秒数，默认 `3`
- `-v`：详细模式，实时打印每个目标探测过程

### 2) 运行测试

```bash
cd week05/homework/monitor
go test ./...
```

### 3) 查看运行产物

- 报告文件：`reports/monitor-log-YYYYMMDDHHMMSS.log`
- 运行输出：`reports/run-output.txt`（如需保留终端输出可重定向到该文件）

---

## 测试与验证

当前测试覆盖：

- 配置校验（含 `retry_count` 边界）
- 重试逻辑（失败若干次后成功）
- 并发探测结果数量一致性
- 报表统计与关键字段生成

最近一次回归结果：

```text
?    monitor/cmd/monitor        [no test files]
?    monitor/internal/app       [no test files]
ok   monitor/internal/config    (pass)
ok   monitor/internal/probe     (pass)
ok   monitor/internal/report    (pass)
```

详细记录见：`docs/TEST_RESULTS.md`。

---

## 关键实现要点

1. 使用 `internal` 隔离业务实现，外部仅暴露 CLI 行为。  
2. `probe.Executor` 抽象执行器，便于测试时注入 fake executor。  
3. 重试策略为“总尝试次数 = 1 + retry_count”，逻辑清晰且便于控制。  
4. 报表写入时自动创建 `reports/`，避免首次运行目录不存在报错。  

---

## 已知现象说明

在部分受限网络环境中，公网 HTTP 目标可能出现 `Forbidden` 或 `context deadline exceeded`。  
这类现象通常由运行环境网络策略导致，不影响程序并发、超时、重试与报表逻辑正确性。
