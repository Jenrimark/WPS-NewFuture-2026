## 21.Docker 最小化实例

### 目标

- **服务功能**：编写一个简单的 Go Web 服务，监听 `8080` 端口
- **路由**：`GET /` 返回 `Hello,Docker!`
- **交付**：使用 Docker 构建镜像并在容器中运行，可通过浏览器访问

---

### 目录说明

本练习目录：`week07/practice/01_nginx_volume`

- `main.go`：Go Web 服务源码
- `go.mod`：Go module 定义
- `Dockerfile`：多阶段构建（最小化镜像，最终镜像为 `scratch`）
- `.dockerignore`：减少构建上下文

---

### 1) 本地运行（可选）

```bash
cd week07/practice/01_nginx_volume
go run .
```

浏览器访问：

- `http://127.0.0.1:8080/`

期望返回：

- `Hello,Docker!`

---

### 2) 构建 Docker 镜像

#### 推荐（不依赖拉取 `golang` 镜像，网络更稳）

先在本机编译出 Linux 可执行文件（给 `scratch` 镜像使用）：

```bash
cd week07/practice/01_nginx_volume
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o app .
```

再构建镜像（此时 `Dockerfile` 只会把 `app` 复制进镜像）：

```bash
cd week07/practice/01_nginx_volume
docker build -t hello-docker:mini .
```

#### 备选（多阶段构建，需能拉取 `golang:1.22`）

如果你的 Docker Hub 网络稳定，也可以用多阶段构建版本：

```bash
cd week07/practice/01_nginx_volume
docker build -t hello-docker:mini -f Dockerfile.multistage .
```

如果构建时出现类似 `failed to fetch oauth token` / `i/o timeout`（Docker Hub 网络问题），也可尝试关闭 BuildKit：

```bash
cd week07/practice/01_nginx_volume
DOCKER_BUILDKIT=0 docker build -t hello-docker:mini .
```

---

### 3) 运行容器并映射端口

```bash
docker run --rm -p 8080:8080 --name hello-docker hello-docker:mini
```

浏览器访问：

- `http://127.0.0.1:8080/`

期望返回：

- `Hello,Docker!`

---

### 4) 验证命令（可选）

新开一个终端执行：

```bash
curl -i http://127.0.0.1:8080/
```

---

### 5) 常见问题排查

- **端口被占用**：提示 `bind: address already in use`
  - 解决：换端口映射，例如 `-p 18080:8080`，然后访问 `http://127.0.0.1:18080/`
- **浏览器打不开**：
  - 确认容器在运行：`docker ps`
  - 确认端口映射：`docker port hello-docker`

---

## 22.Nginx 容器与本地目录映射

### 目标与考察点

- **考察点**：Nginx 镜像运行、`-v` 挂载本地目录、`-p` 端口映射
- **验收**：访问 `http://localhost:8080` 能看到页面；修改宿主机 `index.html` 后刷新浏览器即可看到更新，无需重启容器

---

### a) 准备 `index.html`

本目录已提供 `index.html`（可自行改内容）：

- `week07/practice/01_nginx_volume/index.html`

---

### b) 一条 `docker run` 命令启动 Nginx 并挂载目录

在该目录下执行（把当前目录挂载到容器的 `/usr/share/nginx/html`）：

```bash
cd week07/practice/01_nginx_volume
docker run --rm --name nginx-volume -p 8080:80 -v "$(pwd)":/usr/share/nginx/html:ro nginx:alpine
```

浏览器访问：

- `http://localhost:8080`

---

### c) 热更新验证（无需重启容器）

1. 保持上面的容器运行中
2. 在宿主机修改 `index.html`（比如把 `Hello World` 改成别的）
3. 刷新浏览器 `http://localhost:8080`，应立即看到新内容

---

### 常见问题排查

- **8080 被占用**（提示 `bind: address already in use`）
  - 解决：换端口映射，例如 `-p 18080:80`，访问 `http://localhost:18080`
- **页面没更新**
  - 确认修改的是挂载目录下的 `index.html`
  - 强制刷新浏览器缓存（macOS：`Cmd+Shift+R`）

