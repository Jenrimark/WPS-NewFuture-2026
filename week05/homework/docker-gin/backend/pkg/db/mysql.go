package db

import (
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func MustConnectMySQL(dsn string) *gorm.DB {
	var lastErr error
	for i := 0; i < 30; i++ {
		gdb, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			sqlDB, err2 := gdb.DB()
			if err2 == nil {
				sqlDB.SetMaxOpenConns(25)
				sqlDB.SetMaxIdleConns(25)
				sqlDB.SetConnMaxLifetime(5 * time.Minute)
				log.Printf("[db] mysql connected")
				return gdb
			}
			lastErr = err2
		} else {
			lastErr = err
		}
		time.Sleep(2 * time.Second)
	}
	log.Fatalf("mysql connect failed: %v", lastErr)
	return nil
}

