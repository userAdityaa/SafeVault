package models

import (
	"time"

	"github.com/google/uuid"
)

// Folder represents a hierarchical container for organizing user files.
// Folders can be nested by setting ParentID to reference another folder.
// Each folder belongs to a specific user and can contain files and subfolders.
type Folder struct {
	// ID is the unique identifier for the folder
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	// UserID references the user who owns this folder
	UserID uuid.UUID `gorm:"not null;index"`
	// Name is the display name of the folder
	Name string `gorm:"not null"`
	// ParentID references the parent folder (nil for root-level folders)
	ParentID *uuid.UUID `gorm:"index"`
	// CreatedAt timestamp when the folder was created
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
