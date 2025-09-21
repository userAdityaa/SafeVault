// Package graph provides GraphQL schema resolvers for the SnapVault API.
// It acts as the presentation layer, handling GraphQL queries and mutations
// by coordinating with the underlying service layer.
package graph

import "github.com/useradityaa/internal/services"

// Resolver is the root GraphQL resolver that contains all service dependencies.
// It implements the GraphQL schema resolvers and provides access to all
// business logic through the injected services.
type Resolver struct {
	// AuthService handles user authentication and authorization
	AuthService *services.AuthService
	// GoogleService manages Google OAuth authentication
	GoogleService *services.GoogleService
	// FileService handles file upload, storage, and retrieval operations
	FileService *services.FileService
	// FolderService manages folder creation and organization
	FolderService *services.FolderService
	// ShareService handles file and folder sharing between users
	ShareService *services.ShareService
	// PublicLinkService manages public file and folder links
	PublicLinkService *services.PublicLinkService
	// AdminService provides administrative functionality
	AdminService *services.AdminService
	// FileDownloadService tracks file download events
	FileDownloadService *services.FileDownloadService
	// FileActivityService tracks user file activity (previews, downloads)
	FileActivityService *services.FileActivityService
	// StarredService manages user's starred files and folders
	StarredService *services.StarredService
}
