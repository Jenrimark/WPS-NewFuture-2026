# 需已安装 protoc、protoc-gen-go、protoc-gen-go-grpc，且 PATH 含 $(go env GOPATH)/bin
# 生成物写入 proto/gen，file-web 与 file-service 通过 go.mod replace 共享同一包路径，避免手工复制。
.PHONY: proto
proto:
	cd proto && protoc -I . file.proto \
		--go_out=. --go_opt=module=local.dev/ginfilepb \
		--go-grpc_out=. --go-grpc_opt=module=local.dev/ginfilepb
