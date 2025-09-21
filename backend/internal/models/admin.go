package models

import (
	"time"

	"github.com/google/uuid"
)

// AdminUserInfo represents comprehensive user information displayed in the admin dashboard.
// This model aggregates user account details with usage statistics for administrative oversight.
// It includes file counts, folder counts, and storage consumption metrics.
type AdminUserInfo struct {
	// ID is the unique identifier for the user
	ID uuid.UUID `json:"id"`
	// Email is the user's unique email address
	Email string `json:"email"`
	// Name is the user's display name (optional for manual users)
	Name string `json:"name,omitempty"`
	// Picture is the URL to the user's profile picture (typically from Google OAuth)
	Picture string `json:"picture,omitempty"`
	// CreatedAt timestamp when the user account was created
	CreatedAt time.Time `json:"createdAt"`
	// UpdatedAt timestamp when the user account was last modified
	UpdatedAt time.Time `json:"updatedAt"`
	// TotalFiles is the count of files owned by the user
	TotalFiles int `json:"totalFiles"`
	// TotalFolders is the count of folders created by the user
	TotalFolders int `json:"totalFolders"`
	// StorageUsed is the total storage space consumed by the user's files in bytes
	StorageUsed int64 `json:"storageUsed"`
}
