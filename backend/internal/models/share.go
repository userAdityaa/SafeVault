package models

import (
	"time"

	"github.com/google/uuid"
)

// FileShare represents a file shared with a user
type FileShare struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	FileID          uuid.UUID  `gorm:"not null;index"`
	OwnerID         uuid.UUID  `gorm:"not null;index"`
	SharedWithEmail string     `gorm:"not null;index"`
	SharedWithID    *uuid.UUID `gorm:"index"`
	Permission      string     `gorm:"default:'viewer'"`
	SharedAt        time.Time  `gorm:"autoCreateTime"`
	ExpiresAt       *time.Time

	File           File  `gorm:"foreignKey:FileID"`
	Owner          User  `gorm:"foreignKey:OwnerID"`
	SharedWithUser *User `gorm:"foreignKey:SharedWithID"`
}

// FolderShare represents a folder shared with a user
type FolderShare struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	FolderID        uuid.UUID  `gorm:"not null;index"`
	OwnerID         uuid.UUID  `gorm:"not null;index"`
	SharedWithEmail string     `gorm:"not null;index"`
	SharedWithID    *uuid.UUID `gorm:"index"`
	Permission      string     `gorm:"default:'viewer'"`
	SharedAt        time.Time  `gorm:"autoCreateTime"`
	ExpiresAt       *time.Time

	Folder         Folder `gorm:"foreignKey:FolderID"`
	Owner          User   `gorm:"foreignKey:OwnerID"`
	SharedWithUser *User  `gorm:"foreignKey:SharedWithID"`
}
