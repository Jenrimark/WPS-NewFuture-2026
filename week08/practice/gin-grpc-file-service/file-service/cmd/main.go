package main

import (
	"log"
	"net"
	"os"
	"path/filepath"

	"local.dev/ginfilepb/gen/filepb"
	"file-service/internal/database"
	grpcHandler "file-service/internal/handler"
	"file-service/internal/repository"
	"file-service/internal/service"

	"google.golang.org/grpc"
)

func main() {
	addr := getenv("FILE_SERVICE_LISTEN", ":50051")
	dbPath := getenv("FILE_SERVICE_DB", filepath.Join("data", "files.db"))

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		log.Fatalf("mkdir data: %v", err)
	}

	dsn := dbPath + "?_foreign_keys=on&_busy_timeout=5000"
	db, err := database.Open(dsn)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	repo := repository.NewFile(db)
	svc := service.NewFile(repo)
	srv := grpc.NewServer()
	filepb.RegisterFileServiceServer(srv, grpcHandler.NewFileGRPC(svc))

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("listen %s: %v", addr, err)
	}
	log.Printf("file-service listening on %s (db=%s)", addr, dbPath)
	if err := srv.Serve(ln); err != nil {
		log.Fatal(err)
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
