package main

import (
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/rs/cors"

	"github.com/useradityaa/graph"
	"github.com/useradityaa/internal/config"
	"github.com/useradityaa/internal/repository"
	"github.com/useradityaa/internal/services"
)

const defaultPort = "8080"

func main() {
	// Init Postgres
	db := config.InitDB()
	defer db.Close()

	// Read port from env
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	userRepo := repository.NewUserRepository(db)

	authService := services.AuthService{UserRepo: userRepo}
	googleService := services.GoogleService{UserRepo: userRepo}

	// Create GraphQL server
	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			AuthService:   &authService,
			GoogleService: &googleService,
		},
	}))

	// Set up CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all origins for development;
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler

	// Playground at /
	http.Handle("/", playground.Handler("GraphQL Playground", "/query"))

	// GraphQL endpoint at /query with CORS
	http.Handle("/query", corsHandler(srv))

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
