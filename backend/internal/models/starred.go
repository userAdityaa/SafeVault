package models

import (
	"time"

	"github.com/google/uuid"
)

// StarredItem represents a user's starred file or folder.
// Users can star files and folders for quick access and organization.
// A composite unique constraint prevents duplicate stars for the same item by the same user.
type StarredItem struct {
	// ID is the unique identifier for the starred item record
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	// UserID references the user who starred the item
	UserID uuid.UUID `gorm:"not null;index"`
	// ItemType indicates whether this is a "file" or "folder"
	ItemType string `gorm:"not null"` // "file" or "folder"
	// ItemID references the UUID of the starred file or folder
	ItemID uuid.UUID `gorm:"not null;index"`
	// StarredAt timestamp when the item was starred
	StarredAt time.Time `gorm:"autoCreateTime"`

	// Composite unique constraint to prevent duplicate stars
	// This will be added in the migration
}

// StarredFile represents a starred file with complete file details.
// This model combines the starred item record with the associated file information.
type StarredFile struct {
	StarredItem
	// File contains the complete file details for the starred item
	File File `gorm:"foreignKey:ItemID"`
}

// StarredFolder represents a starred folder with complete folder details.
// This model combines the starred item record with the associated folder information.
type StarredFolder struct {
	StarredItem
	// Folder contains the complete folder details for the starred item
	Folder Folder `gorm:"foreignKey:ItemID"`
}
