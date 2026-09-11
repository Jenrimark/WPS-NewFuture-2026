package config

import "os"

type Config struct {
	Port      string
	JWTSecret string
	DBPath    string

	AliAccessKeyID     string
	AliAccessKeySecret string
	AliRAMRoleARN      string
	STSRegion          string
	OSSRegion          string
	OSSBucket          string
	OSSUploadPrefix    string

	DashscopeAPIKey string
	DashscopeModel  string
	DashscopeBase   string
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

	stsRegion := os.Getenv("ALIYUN_STS_REGION")
	if stsRegion == "" {
		stsRegion = "cn-hangzhou"
	}

	ossRegion := os.Getenv("OSS_REGION")
	if ossRegion == "" {
		ossRegion = "oss-cn-hangzhou"
	}

	prefix := os.Getenv("OSS_UPLOAD_PREFIX")
	if prefix == "" {
		prefix = "poster-uploads/"
	}

	dashBase := os.Getenv("DASHSCOPE_BASE_URL")
	if dashBase == "" {
		dashBase = "https://dashscope.aliyuncs.com"
	}

	dashModel := os.Getenv("DASHSCOPE_MODEL")
	if dashModel == "" {
		dashModel = "qwen-image-plus"
	}

	return &Config{
		Port:               port,
		JWTSecret:          secret,
		DBPath:             dbPath,
		AliAccessKeyID:     os.Getenv("ALIYUN_ACCESS_KEY_ID"),
		AliAccessKeySecret: os.Getenv("ALIYUN_ACCESS_KEY_SECRET"),
		AliRAMRoleARN:      os.Getenv("ALIYUN_RAM_ROLE_ARN"),
		STSRegion:          stsRegion,
		OSSRegion:          ossRegion,
		OSSBucket:          os.Getenv("OSS_BUCKET"),
		OSSUploadPrefix:    prefix,
		DashscopeAPIKey:    os.Getenv("DASHSCOPE_API_KEY"),
		DashscopeModel:     dashModel,
		DashscopeBase:      dashBase,
	}
}
