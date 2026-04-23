package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

func OpenRedis(cfg RedisConfig) (*redis.Client, error) {
	addr := cfg.Addr
	if addr == "" {
		addr = os.Getenv("REDIS_ADDR")
	}
	if addr == "" {
		addr = "127.0.0.1:6379"
	}

	password := cfg.Password
	if password == "" {
		password = os.Getenv("REDIS_PASSWORD")
	}

	dbIndex := cfg.DB
	if dbIndex == 0 {
		if raw := os.Getenv("REDIS_DB"); raw != "" {
			v, err := strconv.Atoi(raw)
			if err != nil {
				return nil, fmt.Errorf("invalid REDIS_DB: %w", err)
			}
			dbIndex = v
		}
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           dbIndex,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		_ = rdb.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	log.Printf("[db] redis connected: %s db=%d", addr, dbIndex)
	return rdb, nil
}
