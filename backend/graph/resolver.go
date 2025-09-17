package graph

import "github.com/useradityaa/internal/services"

type Resolver struct {
	AuthService   *services.AuthService
	GoogleService *services.GoogleService
	FileService   *services.FileService
}
