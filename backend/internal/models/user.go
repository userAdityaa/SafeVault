// Package models defines the database models and structures used throughout the SnapVault application.
// These models represent the core entities stored in PostgreSQL and their relationships.
package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a registered user in the SnapVault system.
// Users can authenticate using email/password or Google OAuth and manage their files and folders.
// Each user has a unique UUID as primary key and a unique email address.
type User struct {
	// ID is the unique identifier for the user, auto-generated as UUID
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	// Email is the user's unique email address used for authentication
	Email string `gorm:"uniqueIndex;not null"`
	// PasswordHash stores the bcrypt hash of the user's password
	PasswordHash string `gorm:"not null"`
	// CreatedAt timestamp when the user account was created
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
