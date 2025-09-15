package config

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func InitDB() *pgxpool.Pool {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment")
	}

	dsn := os.Getenv("DATABASE_URL")
	dbpool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}

	return dbpool
}
