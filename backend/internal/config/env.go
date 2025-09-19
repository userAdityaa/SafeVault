package config

import (
	"log"
	"os"
	"strconv"
	"sync"

	"github.com/joho/godotenv"
)

// Config centralizes all environment configuration for the backend.
// Use config.Load() to access a singleton instance.
type Config struct {
	Port        string
	DatabaseURL string

	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioUseSSL    bool
	MinioBucket    string
	MinioPublicURL string

	GoogleClientID string
}

var (
	cfg  *Config
	once sync.Once
)

// Load reads environment variables (loading .env once) and returns a singleton Config.
func Load() *Config {
	once.Do(func() {
		// Load .env if present (ignore error, variables may come from environment)
		if err := godotenv.Load(); err != nil {
			log.Println("config: no .env file found, continuing with system environment")
		}

		cfg = &Config{
			Port:           getEnv("PORT", "8080"),
			DatabaseURL:    getEnv("DATABASE_URL_PROD", ""),
			MinioEndpoint:  getEnv("MINIO_ENDPOINT", ""),
			MinioAccessKey: getEnv("MINIO_ACCESS_KEY", ""),
			MinioSecretKey: getEnv("MINIO_SECRET_KEY", ""),
			MinioUseSSL:    getEnvBool("MINIO_USE_SSL", false),
			MinioBucket:    getEnv("MINIO_BUCKET", ""),
			MinioPublicURL: getEnv("MINIO_PUBLIC_ENDPOINT", ""),
			GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
		}
	})
	return cfg
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			return b
		}
	}
	return def
}
