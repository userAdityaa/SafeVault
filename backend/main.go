package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/cors"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/graph"
	"github.com/useradityaa/internal/config"
	"github.com/useradityaa/internal/middleware"
	"github.com/useradityaa/internal/repository"
	"github.com/useradityaa/internal/services"
)

const defaultPort = "8080"

func main() {
	// Init Postgres
	db := config.InitDB()
	defer db.Close()

	// Run SQL migrations from ./migrations on startup
	if err := runMigrations(db); err != nil {
		log.Fatalf("migration error: %v", err)
	}

	// Read port from env
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	userRepo := repository.NewUserRepository(db)
	fileRepo := repository.NewFileRepository(db)

	authService := services.AuthService{UserRepo: userRepo}
	googleService := services.GoogleService{UserRepo: userRepo}

	// MinIO config (from env)
	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	minioAccessKey := os.Getenv("MINIO_ACCESS_KEY")
	minioSecretKey := os.Getenv("MINIO_SECRET_KEY")
	minioUseSSL := os.Getenv("MINIO_USE_SSL") == "true"
	minioBucket := os.Getenv("MINIO_BUCKET")
	minioPublic := os.Getenv("MINIO_PUBLIC_ENDPOINT")

	var minioClient *minio.Client
	if minioEndpoint != "" && minioAccessKey != "" && minioSecretKey != "" {
		c, err := minio.New(minioEndpoint, &minio.Options{
			Creds:  credentials.NewStaticV4(minioAccessKey, minioSecretKey, ""),
			Secure: minioUseSSL,
		})
		if err != nil {
			log.Printf("warning: failed to init MinIO client: %v", err)
		} else {
			minioClient = c
		}
	}

	var fileService *services.FileService
	if minioClient != nil && minioBucket != "" {
		// Ensure bucket exists
		exists, err := minioClient.BucketExists(context.Background(), minioBucket)
		if err != nil {
			log.Printf("warning: failed to check MinIO bucket: %v", err)
		} else if !exists {
			if err := minioClient.MakeBucket(context.Background(), minioBucket, minio.MakeBucketOptions{}); err != nil {
				log.Printf("warning: failed to create MinIO bucket %q: %v", minioBucket, err)
			} else {
				log.Printf("created MinIO bucket %q", minioBucket)
			}
		}
		fileService = services.NewFileService(fileRepo, minioClient, minioBucket, minioPublic)
	}

	// Create GraphQL server
	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			AuthService:   &authService,
			GoogleService: &googleService,
			FileService:   fileService,
		},
	}))

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler

	// Playground at /
	http.Handle("/", playground.Handler("GraphQL Playground", "/query"))

	// GraphQL endpoint at /query with CORS and auth middleware
	http.Handle("/query", corsHandler(middleware.AuthMiddleware(srv)))

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// runMigrations executes all .sql files in ./migrations in lexicographic order
func runMigrations(db *pgxpool.Pool) error {
	dir := "./migrations"
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(strings.ToLower(name), ".sql") {
			files = append(files, filepath.Join(dir, name))
		}
	}
	sort.Strings(files)
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		sql := string(b)
		if strings.TrimSpace(sql) == "" {
			continue
		}
		if _, err := db.Exec(context.Background(), sql); err != nil {
			return fmt.Errorf("failed executing %s: %w", f, err)
		}
		log.Printf("applied migration: %s", filepath.Base(f))
	}
	return nil
}
