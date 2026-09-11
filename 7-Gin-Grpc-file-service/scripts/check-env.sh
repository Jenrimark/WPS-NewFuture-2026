#!/usr/bin/env bash
# 检查 gin-grpc-file-service 开发/构建所需工具是否就绪
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()  { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
bad() { echo -e "${RED}[fail]${NC} $*"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0

if command -v go >/dev/null 2>&1; then
  ver="$(go version)"
  ok "go: $ver"
  GOBIN="$(go env GOPATH)/bin"
  export PATH="$GOBIN:$PATH"
else
  bad "未安装 go"
  fail=1
fi

if command -v protoc >/dev/null 2>&1; then
  ok "protoc: $(protoc --version 2>&1)"
else
  bad "未安装 protoc（macOS: brew install protobuf；Ubuntu: apt install protobuf-compiler）"
  fail=1
fi

for plug in protoc-gen-go protoc-gen-go-grpc; do
  if command -v "$plug" >/dev/null 2>&1; then
    ok "$plug: $(command -v "$plug")"
  else
    bad "未找到 $plug（执行: go install google.golang.org/protobuf/cmd/protoc-gen-go@latest 与 grpc 插件）"
    fail=1
  fi
done

if command -v gcc >/dev/null 2>&1; then
  ok "gcc: $(command -v gcc)"
elif command -v clang >/dev/null 2>&1; then
  ok "clang: $(command -v clang)"
else
  warn "未找到 gcc/clang；file-service 使用 sqlite3 时可能需安装 C 编译器"
fi

if [[ "${fail:-0}" -eq 0 ]] && command -v go >/dev/null 2>&1; then
  echo ""
  echo "解析 go.mod（file-web / file-service / proto）…"
  (cd "$ROOT/proto" && go mod download >/dev/null && ok "proto: go mod download")
  (cd "$ROOT/file-web" && go mod download >/dev/null && ok "file-web: go mod download")
  (cd "$ROOT/file-service" && go mod download >/dev/null && ok "file-service: go mod download")
fi

echo ""
if [[ "${fail:-0}" -ne 0 ]]; then
  bad "请先补齐上述失败项，详见 docs/环境安装.md"
  exit 1
fi
ok "环境检查通过。可在项目根目录执行: make proto"
exit 0
