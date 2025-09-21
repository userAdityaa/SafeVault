package models

import (
	"time"

	"github.com/google/uuid"
)

type StarredItem struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"not null;index"`
	ItemType  string    `gorm:"not null"` // "file" or "folder"
	ItemID    uuid.UUID `gorm:"not null;index"`
	StarredAt time.Time `gorm:"autoCreateTime"`

	// Composite unique constraint to prevent duplicate stars
	// This will be added in the migration
}

// StarredFile represents a starred file with file details
type StarredFile struct {
	StarredItem
	File File `gorm:"foreignKey:ItemID"`
}

// StarredFolder represents a starred folder with folder details
type StarredFolder struct {
	StarredItem
	Folder Folder `gorm:"foreignKey:ItemID"`
}
