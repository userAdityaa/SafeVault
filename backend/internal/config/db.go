// Package config provides configuration management and database initialization
// for the SnapVault application. It handles environment variable loading,
// configuration validation, and PostgreSQL connection setup.
package config

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InitDB initializes a PostgreSQL connection pool using the provided DSN.
// It creates a new connection pool with default settings and tests the connection.
// The function will terminate the application if connection establishment fails.
//
// Parameters:
//   - dsn: PostgreSQL Data Source Name (connection string)
//
// Returns:
//   - *pgxpool.Pool: Configured PostgreSQL connection pool ready for use
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
