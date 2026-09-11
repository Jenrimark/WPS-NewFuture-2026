package config

import (
	"log"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Port      string
	GinMode   string
	MySQLDSN  string
	JWTSecret string

	DeepSeekAPIKey  string
	DeepSeekBaseURL string
	DeepSeekModel   string

	QwenAPIKey  string
	QwenBaseURL string
	QwenModel   string
}

func MustLoad() Config {
	v := viper.New()
	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	_ = v.ReadInConfig() // optional

	v.SetDefault("APP_PORT", "8080")
	v.SetDefault("GIN_MODE", "release")
	v.SetDefault("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
	v.SetDefault("DEEPSEEK_MODEL", "deepseek-chat")
	v.SetDefault("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
	v.SetDefault("QWEN_MODEL", "qwen-plus")

	cfg := Config{
		Port:      v.GetString("APP_PORT"),
		GinMode:   v.GetString("GIN_MODE"),
		MySQLDSN:  v.GetString("MYSQL_DSN"),
		JWTSecret: v.GetString("JWT_SECRET"),

		DeepSeekAPIKey:  v.GetString("DEEPSEEK_API_KEY"),
		DeepSeekBaseURL: v.GetString("DEEPSEEK_BASE_URL"),
		DeepSeekModel:   v.GetString("DEEPSEEK_MODEL"),

		QwenAPIKey:  v.GetString("QWEN_API_KEY"),
		QwenBaseURL: v.GetString("QWEN_BASE_URL"),
		QwenModel:   v.GetString("QWEN_MODEL"),
	}

	if cfg.MySQLDSN == "" {
		log.Fatalf("MYSQL_DSN is empty")
	}
	if cfg.JWTSecret == "" {
		log.Fatalf("JWT_SECRET is empty")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	return cfg
}

