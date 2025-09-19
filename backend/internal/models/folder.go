package models

import (
	"time"

	"github.com/google/uuid"
)

// Folder represents a hierarchical container for user files.
type Folder struct {
	ID        uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID  `gorm:"not null;index"`
	Name      string     `gorm:"not null"`
	ParentID  *uuid.UUID `gorm:"index"`
	CreatedAt time.Time  `gorm:"autoCreateTime"`
}
