package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"studentsystem/controllers"
	"studentsystem/routes"
)

func main() {
	r := gin.Default()

	store := controllers.NewStudentStore()
	ctl := controllers.NewStudentController(store)
	routes.RegisterStudentRoutes(r, ctl)

	log.Println("学生信息管理系统启动: http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server start failed: %v", err)
	}
}

