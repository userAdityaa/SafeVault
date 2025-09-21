package models

import (
	"time"

	"github.com/google/uuid"
)

// File represents a unique file stored in the system.
// Files are deduplicated by SHA-256 hash, meaning identical content is stored only once.
// Multiple users can reference the same file through UserFile associations.
type File struct {
	// ID is the unique identifier for the file
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	// Hash is the SHA-256 hash of the file content, used for deduplication
	Hash string `gorm:"size:64;uniqueIndex;not null"` // SHA-256 of content
	// StoragePath is the file's location in MinIO/S3 storage
	StoragePath string `gorm:"not null"` // Path in MinIO/S3
	// OriginalName is the file's original filename when uploaded
	OriginalName string `gorm:"not null"`
	// MimeType describes the file's content type (e.g., "image/jpeg", "application/pdf")
	MimeType string
	// Size is the file size in bytes
	Size int64 `gorm:"not null"`
	// RefCount tracks how many users reference this file (for cleanup purposes)
	RefCount int `gorm:"default:0"` // Number of users referencing
	// Visibility controls the file's access level: "private", "public", or "shared"
	Visibility string `gorm:"default:'private'"` // private, public, shared
	// CreatedAt timestamp when the file was first uploaded to the system
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// UserFile represents the association between a user and a file.
// This allows multiple users to have access to the same file with different roles.
// Files can be organized into folders through the FolderID field.
type UserFile struct {
	// ID is the unique identifier for this user-file association
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	// UserID references the user who has access to the file
	UserID uuid.UUID `gorm:"not null;index"`
	// FileID references the file being accessed
	FileID uuid.UUID `gorm:"not null;index"`
	// Role defines the user's permission level: "owner", "editor", or "viewer"
	Role string `gorm:"default:'owner'"` // owner/editor/viewer
	// UploadedAt timestamp when this association was created
	UploadedAt time.Time `gorm:"autoCreateTime"`
	// FolderID optionally groups this file into a folder (nil for root level)
	FolderID *uuid.UUID `gorm:"index"`

	// File is the associated file record loaded via foreign key
	File File `gorm:"foreignKey:FileID"`

	// Non-persisted helper fields populated via joins for GraphQL responses
	// UploaderEmail contains the email of the user who originally uploaded the file
	UploaderEmail string
	// UploaderName contains the display name of the uploader (if available)
	UploaderName string
	// UploaderPicture contains the profile picture URL of the uploader (if available)
	UploaderPicture string
}
