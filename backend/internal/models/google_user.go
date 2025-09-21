package models

import (
	"time"

	"github.com/google/uuid"
)

// GoogleUser represents a user who authenticated using Google OAuth.
// This model stores profile information obtained from Google during the OAuth flow.
// Google users don't have password hashes since they authenticate through Google's servers.
type GoogleUser struct {
	// ID is the unique identifier for the Google user
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	// Email is the user's Google account email address (unique)
	Email string `gorm:"uniqueIndex;not null"`
	// Name is the user's display name from their Google profile
	Name string `gorm:"default:''"`
	// Picture is the URL to the user's Google profile picture
	Picture string `gorm:"default:''"`
	// CreatedAt timestamp when the Google user was first authenticated
	CreatedAt time.Time `gorm:"autoCreateTime"`
	// UpdatedAt timestamp when the Google user profile was last updated
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
