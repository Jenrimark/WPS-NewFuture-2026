package main

import (
	"log"
	"os"
	"strconv"

	"file-web/internal/grpcclient"
	"file-web/internal/handler"
	"file-web/internal/service"
	"file-web/internal/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	grpcAddr := getenv("FILE_SERVICE_ADDR", "localhost:50051")
	httpAddr := getenv("HTTP_ADDR", ":8080")
	uploadRoot := getenv("UPLOAD_ROOT", ".")

	client, err := grpcclient.Dial(grpcAddr)
	if err != nil {
		log.Fatalf("grpc: %v", err)
	}
	defer client.Close()

	maxUpload := getenvInt64("MAX_UPLOAD_BYTES", 32<<20)
	store := storage.NewLocal(uploadRoot, maxUpload)
	svc := service.New(store, client)
	h := handler.NewFile(svc, maxUpload)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	h.Register(r)

	log.Printf("file-web listening on %s (grpc=%s, uploadRoot=%s)", httpAddr, grpcAddr, uploadRoot)
	if err := r.Run(httpAddr); err != nil {
		log.Fatal(err)
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getenvInt64(k string, def int64) int64 {
	s := os.Getenv(k)
	if s == "" {
		return def
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil || v <= 0 {
		return def
	}
	return v
}
