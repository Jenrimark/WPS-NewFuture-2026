package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"wordapp-backend/api"
	apimw "wordapp-backend/api/middleware"
	"wordapp-backend/pkg/config"
	"wordapp-backend/pkg/db"
	"wordapp-backend/service"
)

func main() {
	cfg := config.MustLoad()

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	database := db.MustConnectMySQL(cfg.MySQLDSN)
	if err := db.RunStructuralMigrations(database); err != nil {
		log.Fatalf("[db] migrations failed: %v", err)
	}

	authSvc := service.NewAuthService(database, cfg.JWTSecret)
	wordSvc := service.NewWordService(database, cfg)
	statsSvc := service.NewStatsService(database)

	authH := api.NewAuthHandler(authSvc)
	wordH := api.NewWordHandler(wordSvc)
	statsH := api.NewStatsHandler(statsSvc)

	pub := r.Group("/api")
	{
		pub.POST("/register", authH.Register)
		pub.POST("/login", authH.Login)
	}

	authed := r.Group("/api")
	authed.Use(apimw.JWTAuth(cfg.JWTSecret))
	{
		authed.GET("/words/query", wordH.QueryWord)
		authed.GET("/words/export", wordH.ExportWords)
		authed.GET("/stats/summary", statsH.Summary)
		authed.POST("/words", wordH.SaveWord)
		authed.GET("/words", wordH.ListWords)
		authed.DELETE("/words/:id", wordH.DeleteWord)
	}

	addr := ":" + cfg.Port
	log.Printf("server listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server start failed: %v", err)
	}
}
