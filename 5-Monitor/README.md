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
| 11 | 单元测试 | `app/config/probe/report` 均有测试 | ✅ |
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
    │   ├── app.go                  # CLI 参数解析 + 流程编排
    │   └── app_test.go             # CLI 参数默认值/覆盖/校验测试
    ├── config/
    │   ├── config.go               # 配置读取与校验
    │   └── config_test.go          # 配置校验 + 配置加载测试
    ├── probe/
    │   ├── probe.go                # 并发探测、协议执行、重试、超时
    │   └── probe_test.go           # 重试、并发汇总、协议解析测试
    └── report/
        ├── report.go               # 统计分析、报表生成与写文件
        └── report_test.go          # 统计与终端/文件报表格式测试
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

## 核心技术实现（代码级说明）

下面按老师视频验收关注点，提取**当前仓库真实代码节选**并解释“如何做到”。

### 1) 配置层：JSON 加载 + 字段校验（含 `retry_count <= 3`）

```go
// internal/config/config.go（节选）
func Load(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if len(c.Targets) == 0 {
		return errors.New("config.targets cannot be empty")
	}
	for i, target := range c.Targets {
		if target.Name == "" {
			return fmt.Errorf("targets[%d].name cannot be empty", i)
		}
		if target.Address == "" {
			return fmt.Errorf("targets[%d].address cannot be empty", i)
		}
		if target.Expectation == "" {
			return fmt.Errorf("targets[%d].expectation cannot be empty", i)
		}
		if target.RetryCount < 0 || target.RetryCount > 3 {
			return fmt.Errorf("targets[%d].retry_count must be within [0,3]", i)
		}
	}
	return nil
}
```

实现要点：
- 先读取 JSON，再反序列化，再统一校验，避免“半合法配置”进入执行层；
- `retry_count` 在配置层即拦截越界，确保运行时重试逻辑简单可靠。

### 2) 探测层：协议识别 + 超时控制 + 失败重试

```go
// internal/probe/probe.go（节选）
func (e *defaultExecutor) Probe(ctx context.Context, t config.Target) (string, error) {
	time.Sleep(1 * time.Second) // 作业要求：每个探测任务人为加入 1s 延迟
	if IsHTTP(t.Address) {
		return e.probeHTTP(ctx, t)
	}
	return e.probeTCP(ctx, t)
}

func runSingleTarget(t config.Target, timeout time.Duration, executor Executor) Result {
	attempts := 0
	maxAttempts := 1 + t.RetryCount
	startOverall := time.Now()
	lastStatus := ""
	var lastErr error

	for attempts < maxAttempts {
		attempts++
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		status, err := executor.Probe(ctx, t)
		cancel()
		lastStatus = status
		lastErr = err
		if err == nil {
			return Result{
				Target:      t,
				Protocol:    DetectProtocol(t.Address),
				Success:     true,
				Latency:     time.Since(startOverall),
				Attempts:    attempts,
				Status:      status,
				FinishedAt:  time.Now(),
				Expectation: t.Expectation,
			}
		}
	}
	return Result{
		Target:      t,
		Protocol:    DetectProtocol(t.Address),
		Success:     false,
		Latency:     time.Since(startOverall),
		Attempts:    attempts,
		Status:      lastStatus,
		ErrMessage:  lastErr.Error(),
		FinishedAt:  time.Now(),
		Expectation: t.Expectation,
	}
}
```

实现要点：
- 协议识别由 `IsHTTP` 分流 HTTP/TCP；
- 每次尝试都用 `context.WithTimeout`，防止单目标阻塞拖垮全局；
- 总尝试次数 = `1 + retry_count`，严格符合作业描述。

### 3) 并发层：`goroutine + WaitGroup + channel` 安全汇总

```go
// internal/probe/probe.go（节选）
func RunWithExecutor(targets []config.Target, opts Options, executor Executor) []Result {
	resultsCh := make(chan Result, len(targets))
	var wg sync.WaitGroup

	for _, t := range targets {
		target := t
		wg.Add(1)
		go func() {
			defer wg.Done()
			result := runSingleTarget(target, opts.Timeout, executor)
			if opts.Verbose {
				fmt.Printf("[probe] target=%s protocol=%s success=%v attempts=%d latency=%s status=%s err=%s\n",
					result.Target.Name, result.Protocol, result.Success, result.Attempts,
					result.Latency.Truncate(time.Millisecond), result.Status, result.ErrMessage)
			}
			resultsCh <- result
		}()
	}

	wg.Wait()
	close(resultsCh)

	results := make([]Result, 0, len(targets))
	for r := range resultsCh {
		results = append(results, r)
	}
	return results
}
```

实现要点：
- 每个目标独立 goroutine，实现并发探测；
- 用 `WaitGroup` 保证“所有探测完成后再汇总”；
- 用 channel 回传结果，避免多协程直接写共享切片导致竞态。

### 4) 报表层：统计分析 + 排序 + 日志落盘

```go
// internal/report/report.go（节选）
func BuildStats(results []probe.Result) Stats {
	stats := Stats{
		Total:   len(results),
		Buckets: map[string]int{"<100ms": 0, "100ms-500ms": 0, "500ms-1s": 0, "1s-3s": 0, ">3s": 0},
	}
	// ...累计成功失败、平均时延、最慢目标、时延分桶...
	return stats
}

func WriteFile(dir string, now time.Time, content string) ([]string, error) {
	fileName := fmt.Sprintf("monitor-log-%s.log", now.Format("20060102150405"))
	rootPath := dir + string(os.PathSeparator) + fileName
	if err := os.WriteFile(rootPath, []byte(content), 0o644); err != nil {
		return nil, err
	}
	return []string{rootPath}, nil
}
```

实现要点：
- 报表统计维度覆盖成功率、平均时延、时延分布、最慢目标、目标明细；
- 文件名按时间戳命名，输出到项目根目录，便于老师验收定位。

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

测试文件清单（当前仓库）：

- `internal/app/app_test.go`
- `internal/config/config_test.go`
- `internal/probe/probe_test.go`
- `internal/report/report_test.go`

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

---

## 开发中遇到的问题与解决（monitor 版）

### 1) Go 并发循环变量捕获问题（goroutine 常见坑）

**现象**：并发探测时，多个 goroutine 可能错误地读取到同一个循环变量，导致目标错乱。  
**原因**：`for range` 中的迭代变量在闭包里直接引用，属于 Go 并发编程的经典坑。  
**解决**：在启动 goroutine 前使用 `target := t` 重新绑定变量，再传入闭包执行，确保每个探测任务拿到自己独立的目标数据。

```go
// 问题写法（示例）
for _, t := range targets {
	go func() {
		_ = runSingleTarget(t, opts.Timeout, executor) // 闭包直接用循环变量
	}()
}

// 修正写法（当前实现）
for _, t := range targets {
	target := t
	go func() {
		_ = runSingleTarget(target, opts.Timeout, executor)
	}()
}
```

### 2) 公网目标在不同环境下出现 `Forbidden` / 超时

**现象**：部分网站返回 `Forbidden` 或 `context deadline exceeded`，导致结果看起来“不稳定”。  
**原因**：目标站点风控策略、访问限制和本地网络出口环境差异，不属于程序逻辑错误。  
**解决**：在探测层完整记录错误原因并写入终端与日志报表；在文档中明确该类现象是运行环境差异，避免误判功能缺陷。

```go
// 关键实现（当前实现）
resp, err := e.httpClient.Do(req)
if err != nil {
	if strings.EqualFold(strings.TrimSpace(t.Expectation), "fail") {
		return "Fail", nil
	}
	return "", err // 保留真实错误给上层结果与报表
}
```

### 3) Go 超时控制与资源释放（`context.WithTimeout` + `cancel`）

**现象**：某些目标响应慢或阻塞时，单个探测容易拖住整体流程。  
**原因**：如果不做超时治理，网络 I/O 在并发场景会放大阻塞风险。  
**解决**：每次尝试都通过 `context.WithTimeout` 限制执行时长，并在调用后立即 `cancel()` 主动释放资源，保证探测器在高并发下也能稳定收敛。

```go
// 问题写法（示例）
status, err := executor.Probe(context.Background(), t) // 无超时、无释放

// 修正写法（当前实现）
ctx, cancel := context.WithTimeout(context.Background(), timeout)
status, err := executor.Probe(ctx, t)
cancel()
```

### 4) Go 可测试性设计：接口抽象 + 假实现驱动单测

**现象**：真实 HTTP/TCP 探测依赖外部网络，直接写测试会不稳定、不可复现。  
**原因**：业务逻辑与底层网络调用耦合过紧时，单元测试很难覆盖重试、失败分支和边界场景。  
**解决**：把探测执行抽象为 `Executor` 接口，在测试中注入 `fakeExecutor`/自定义 `RoundTripper`，稳定验证重试次数、失败路径、协议分流和结果聚合逻辑。

```go
// 可测试接口（当前实现）
type Executor interface {
	Probe(ctx context.Context, t config.Target) (status string, err error)
}

// 测试替身（当前实现）
type fakeExecutor struct {
	failTimes map[string]int
	calls     map[string]int
}

func (f *fakeExecutor) Probe(_ context.Context, t config.Target) (string, error) {
	f.calls[t.Name]++
	if f.calls[t.Name] <= f.failTimes[t.Name] {
		return "Fail", errors.New("temporary error")
	}
	return "200 OK", nil
}
```
