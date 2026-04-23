## 23.Go 后端 API 的容器化构建（分发与运行）

### 目标与考察点

- **接口**：Gin Web 服务监听 `8081`
- **路由**：`GET /ping` 返回 JSON：`{"message":"pong"}`
- **Dockerfile**：多阶段构建（Multi-stage Build）
- **镜像体积**：最终镜像 **< 20MB**

---

### 目录结构

- `main.go`：Gin API
- `go.mod`：依赖管理
- `Dockerfile`：多阶段构建（最终镜像 `scratch`）

---

### 1) 本地运行（可选）

```bash
cd week07/practice/02_go_api
go run .
```

验证：

```bash
curl -sS http://localhost:8081/ping
```

期望输出：

- `{"message":"pong"}`

---

### 2) Docker 构建镜像

```bash
cd week07/practice/02_go_api
docker build -t go-api:mini .
```

#### Docker Hub 拉取 `golang` 超时的离线构建（保证可验收）

如果你在构建阶段拉取 `golang:1.22` 时遇到 `auth.docker.io/token ... i/o timeout`，可以先在宿主机编译出 Linux 二进制，再用极简 `scratch` 打包（镜像通常几 MB，满足 <20MB）：

```bash
cd week07/practice/02_go_api
GOPROXY=https://goproxy.io,direct GOSUMDB=off CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o app .
docker build -t go-api:mini -f Dockerfile.offline .
```

#### 多阶段构建（作业要求版本）

网络正常时，推荐用多阶段构建（文件：`Dockerfile.multistage`）：

```bash
cd week07/practice/02_go_api
docker build -t go-api:mini -f Dockerfile.multistage --build-arg GOPROXY=https://goproxy.io,direct --build-arg GOSUMDB=off .
```

如果你本机或 Docker 构建过程中遇到 `goproxy.cn ... Forbidden` / 依赖下载失败，可显式指定 GOPROXY：

```bash
cd week07/practice/02_go_api
docker build -t go-api:mini --build-arg GOPROXY=https://proxy.golang.org,direct .
```

如果还卡在 `sumdb` 校验（例如 502/超时），可临时关闭校验：

```bash
cd week07/practice/02_go_api
docker build -t go-api:mini --build-arg GOPROXY=https://goproxy.io,direct --build-arg GOSUMDB=off .
```

查看镜像体积（验收 < 20MB）：

```bash
docker images go-api:mini
```

---

### 3) 运行容器并验收

```bash
docker run --rm --name go-api -p 8081:8081 go-api:mini
```

浏览器或命令行访问：

- `http://localhost:8081/ping`

---

### 常见问题

- **端口被占用**：提示 `bind: address already in use`
  - 解决：改映射端口，例如 `-p 18081:8081`，访问 `http://localhost:18081/ping`
- **Docker Hub 拉取超时**
  - 解决：配置 Docker Desktop 代理/镜像源后重试

