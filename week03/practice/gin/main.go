package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"studentsystem/controllers"
	controllersv2 "studentsystem/controllers/v2"
	controllersv3 "studentsystem/controllers/v3"
	controllersv4 "studentsystem/controllers/v4"
	"studentsystem/db"
	"studentsystem/models"
	"studentsystem/routes"
	routesv2 "studentsystem/routes/v2"
	routesv3 "studentsystem/routes/v3"
	routesv4 "studentsystem/routes/v4"
)

func main() {
	r := gin.Default()

	// v1 (in-memory)
	store := controllers.NewStudentStore()
	ctl := controllers.NewStudentController(store)
	routes.RegisterStudentRoutes(r, ctl)

	// v2 (SQLite + squirrel builder)
	sqliteDB, err := db.OpenSQLite(db.SQLiteConfig{})
	if err != nil {
		log.Fatalf("sqlite init failed: %v", err)
	}
	defer sqliteDB.Close()
	ctlV2 := controllersv2.NewStudentController(sqliteDB)
	routesv2.RegisterStudentRoutes(r, ctlV2)

	// v3 (MySQL + GORM)
	gormDB, err := db.OpenMySQLGorm(db.MySQLConfig{})
	if err != nil {
		log.Printf("mysql init failed (v3 routes will be disabled): %v", err)
	} else {
		if err := gormDB.AutoMigrate(&models.Student{}); err != nil {
			log.Fatalf("mysql automigrate failed: %v", err)
		}
		ctlV3 := controllersv3.NewStudentController(gormDB)
		routesv3.RegisterStudentRoutes(r, ctlV3)

		// v4 (MySQL + GORM + Redis cache)
		redisClient, err := db.OpenRedis(db.RedisConfig{})
		if err != nil {
			log.Printf("redis init failed (v4 routes will be disabled): %v", err)
		} else {
			defer redisClient.Close()
			ctlV4 := controllersv4.NewStudentController(gormDB, redisClient)
			routesv4.RegisterStudentRoutes(r, ctlV4)
		}
	}

	log.Println("学生信息管理系统启动: http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server start failed: %v", err)
	}
}
