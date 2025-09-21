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
	AdminEmail     string
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
			AdminEmail:     getEnv("ADMIN_EMAIL", ""),
		}
	})
	return cfg
}

// getEnv retrieves an environment variable value with a fallback default.
// This helper function simplifies environment variable access with default values.
//
// Parameters:
//   - key: The environment variable name to retrieve
//   - def: The default value to return if the environment variable is not set
//
// Returns:
//   - string: The environment variable value or the default if not found
func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// getEnvBool retrieves a boolean environment variable with a fallback default.
// It attempts to parse the environment variable as a boolean value.
//
// Parameters:
//   - key: The environment variable name to retrieve
//   - def: The default boolean value to return if parsing fails or variable is not set
//
// Returns:
//   - bool: The parsed boolean value or the default if parsing fails
func getEnvBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			return b
		}
	}
	return def
}
