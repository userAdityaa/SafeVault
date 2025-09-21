// Package main provides the entry point for the SnapVault file management system.
// This is a GraphQL-based backend server that handles file storage, user authentication,
// sharing capabilities, and administrative functions using PostgreSQL and MinIO.
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

	// env loaded centrally in config.Load()
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

// main initializes and starts the SnapVault GraphQL server.
// It sets up the database connection, runs migrations, initializes MinIO storage,
// creates all necessary services and repositories, and starts the HTTP server
// with GraphQL endpoint and playground.
func main() {
	// Load configuration (loads .env once)
	cfg := config.Load()

	// Init Postgres
	db := config.InitDB(cfg.DatabaseURL)
	defer db.Close()

	// Run SQL migrations from ./migrations on startup
	if err := runMigrations(db); err != nil {
		log.Fatalf("migration error: %v", err)
	}

	port := cfg.Port

	userRepo := repository.NewUserRepository(db)
	fileRepo := repository.NewFileRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	shareRepo := repository.NewShareRepository(db)
	publicLinkRepo := repository.NewPublicLinkRepository(db)
	fileDownloadRepo := repository.NewFileDownloadRepository(db)
	starredRepo := repository.NewStarredRepository(db)

	folderService := services.NewFolderService(folderRepo)

	authService := services.AuthService{UserRepo: userRepo}
	googleService := services.GoogleService{UserRepo: userRepo}

	// MinIO config (from centralized config)
	minioEndpoint := cfg.MinioEndpoint
	minioAccessKey := cfg.MinioAccessKey
	minioSecretKey := cfg.MinioSecretKey
	minioUseSSL := cfg.MinioUseSSL
	minioBucket := cfg.MinioBucket
	minioPublic := cfg.MinioPublicURL

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
		fmt.Print("Minio client initialized: ", minioClient)
		fileService = services.NewFileService(fileRepo, minioClient, minioBucket, minioPublic)
	}

	// Create services
	shareService := services.NewShareService(shareRepo, userRepo, fileRepo, folderRepo)
	publicLinkService := services.NewPublicLinkService(publicLinkRepo, shareRepo, userRepo, fileRepo, folderRepo)
	adminService := services.NewAdminService(userRepo, fileRepo, folderRepo)
	fileDownloadService := services.NewFileDownloadService(fileDownloadRepo, fileRepo, shareRepo)

	// Initialize file activity repository and service
	fileActivityRepo := repository.NewFileActivityRepository(db)
	fileActivityService := services.NewFileActivityService(fileActivityRepo, fileRepo)

	// Initialize starred service
	starredService := services.NewStarredService(starredRepo, fileRepo, folderRepo)

	// Create GraphQL server
	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			AuthService:         &authService,
			GoogleService:       &googleService,
			FileService:         fileService,
			FolderService:       folderService,
			ShareService:        shareService,
			PublicLinkService:   publicLinkService,
			AdminService:        adminService,
			FileDownloadService: fileDownloadService,
			FileActivityService: fileActivityService,
			StarredService:      starredService,
		},
	}))

	corsHandler := cors.New(cors.Options{
		// Currently allowing all origins, methods, headers for simplicity in Development
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

// runMigrations executes all .sql files in ./migrations in lexicographic order.
// It reads all SQL files from the migrations directory, sorts them alphabetically,
// and executes them in order against the provided database connection.
// This ensures database schema changes are applied consistently on startup.
//
// Parameters:
//   - db: PostgreSQL connection pool for executing migration scripts
//
// Returns:
//   - error: nil on success, or an error if any migration fails
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
