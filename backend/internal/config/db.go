package config

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func InitDB(dsn string) *pgxpool.Pool {
	if dsn == "" {
		log.Fatal("database DSN is empty; set DATABASE_URL_PROD or configuration value")
	}
	dbpool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	return dbpool
}
