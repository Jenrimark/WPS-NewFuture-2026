package config

import "os"

type Config struct {
	Port      string
	JWTSecret string
	DBPath    string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "poster-designer-default-secret"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "poster.db"
	}

	return &Config{
		Port:      port,
		JWTSecret: secret,
		DBPath:    dbPath,
	}
}
