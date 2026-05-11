package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"poster-server/config"
	"poster-server/database"
	"poster-server/handlers"
	"poster-server/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	if err := database.Init(cfg); err != nil {
		log.Fatal("数据库初始化失败:", err)
	}
	log.Println("数据库初始化成功")

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// API routes
	api := r.Group("/api")
	{
		auth := &handlers.AuthHandler{Config: cfg}
		api.POST("/register", auth.Register)
		api.POST("/login", auth.Login)

		// Protected routes
		protected := api.Group("", middleware.AuthMiddleware(cfg))
		{
			poster := &handlers.PosterHandler{}
			protected.GET("/posters", poster.List)
			protected.POST("/posters", poster.Create)
			protected.GET("/posters/:id", poster.Get)
			protected.PUT("/posters/:id", poster.Update)
			protected.DELETE("/posters/:id", poster.Delete)

			ossH := &handlers.OSSHandler{Config: cfg}
			protected.GET("/oss/sts", ossH.GetSTS)

			aiH := &handlers.AIHandler{Config: cfg}
			protected.POST("/ai/generate", aiH.Generate)
		}
	}

	// Serve static files (frontend build)
	staticDir := "./static"
	if _, err := os.Stat(staticDir); err == nil {
		// Serve static assets
		r.Static("/assets", staticDir+"/assets")
		r.StaticFile("/favicon.svg", staticDir+"/favicon.svg")

		// SPA fallback: serve index.html for all non-API, non-static routes
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path
			if strings.HasPrefix(path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
				return
			}
			// Check if file exists in static dir
			filePath := staticDir + path
			if _, err := os.Stat(filePath); err == nil {
				c.File(filePath)
				return
			}
			// SPA fallback
			c.File(staticDir + "/index.html")
		})
	} else {
		log.Println("警告: static 目录不存在，前端页面将不可用")
		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "前端未构建，请先运行 npm run build"})
		})
	}

	log.Printf("服务器启动在端口 %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}
