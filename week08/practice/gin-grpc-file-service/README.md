# Gin + gRPC + SQLite 文件服务

双进程：`file-service`（gRPC + SQLite 元数据）、`file-web`（Gin HTTP，在 `UPLOAD_ROOT/uploads/` 落盘）。

## 环境与依赖（必读）

**完整安装步骤（Go / protoc / 插件 / SQLite·CGO）见：[docs/环境安装.md](docs/环境安装.md)**

装好依赖后可在项目根目录自检：

```bash
chmod +x scripts/check-env.sh
./scripts/check-env.sh
```

最小依赖摘要：

| 组件 | 用途 |
|------|------|
| Go 1.22+ | 编译 `file-web`、`file-service`、`proto` |
| `protoc` | 根据 `proto/file.proto` 生成代码 |
| `protoc-gen-go`、`protoc-gen-go-grpc` | Go 代码生成插件（`go install`，需加入 `$(go env GOPATH)/bin`） |
| C 编译器（gcc/clang） | `file-service` 使用 `go-sqlite3`（CGO） |

首次克隆或改了 `.proto` 后：

```bash
cd proto && go mod tidy && cd ..
make proto
cd file-web && go mod tidy && cd ..
cd file-service && go mod tidy && cd ..
```

## 运行顺序

1. 启动 gRPC 文件服务（默认监听 `:50051`，数据库 `file-service/data/files.db`）：

```bash
cd file-service
go run ./cmd
```

环境变量：`FILE_SERVICE_LISTEN`、`FILE_SERVICE_DB`（相对路径以**当前工作目录**为基准，请在 `file-service` 下启动或改为绝对路径）。

2. 启动 Web（默认 `http://127.0.0.1:8080`）：

```bash
cd file-web
go run ./cmd
```

环境变量：`FILE_SERVICE_ADDR`（默认 `localhost:50051`）、`HTTP_ADDR`（默认 `:8080`）、`UPLOAD_ROOT`（上传根目录，默认 `.`，其下为 `uploads/`）、`MAX_UPLOAD_BYTES`（单文件上限字节数，默认 32 MiB）。

## HTTP 示例

批量上传（字段名 `files`，可多文件）：

```bash
curl -F "files=@./a.png" -F "files=@./b.txt" http://127.0.0.1:8080/api/files/uploads
```

单文件也可用字段名 `file`。

列表：

```bash
curl http://127.0.0.1:8080/api/files
```

按 ID 下载：

```bash
curl -OJ http://127.0.0.1:8080/api/files/download/1
```

## 目录说明

| 路径 | 说明 |
|------|------|
| `proto/` | `file.proto`、独立模块 `go.mod`，**生成代码在 `proto/gen/filepb/`** |
| `file-web/` | Gin，`go.mod` 通过 `replace` 引用 `../proto` |
| `file-service/` | gRPC + SQLite，`go.mod` 同样 `replace` 引用 `../proto` |
| `file-web/uploads/` | 运行时生成，已 `.gitignore` |
| `file-service/data/` | SQLite 目录，已 `.gitignore` |
