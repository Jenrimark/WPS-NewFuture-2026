package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"wordapp-backend/pkg/config"
	"wordapp-backend/pkg/db"
	"wordapp-backend/pkg/handlers"
	"wordapp-backend/pkg/middleware"
)

func main() {
	cfg := config.MustLoad()

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	database := db.MustConnectMySQL(cfg.MySQLDSN)

	authH := handlers.NewAuthHandler(database, cfg.JWTSecret)
	wordH := handlers.NewWordHandler(database, cfg)

	api := r.Group("/api")
	{
		api.POST("/register", authH.Register)
		api.POST("/login", authH.Login)
	}

	apiAuth := r.Group("/api")
	apiAuth.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		apiAuth.GET("/words/query", wordH.QueryWord)
		apiAuth.POST("/words", wordH.SaveWord)
		apiAuth.GET("/words", wordH.ListWords)
		apiAuth.DELETE("/words/:id", wordH.DeleteWord)
	}

	addr := ":" + cfg.Port
	log.Printf("server listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server start failed: %v", err)
	}
}
