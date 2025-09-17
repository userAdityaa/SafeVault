package models

import (
	"time"

	"github.com/google/uuid"
)

type File struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Hash         string    `gorm:"size:64;uniqueIndex;not null"` // SHA-256 of content
	StoragePath  string    `gorm:"not null"`                     // Path in MinIO/S3
	OriginalName string    `gorm:"not null"`
	MimeType     string
	Size         int64     `gorm:"not null"`
	RefCount     int       `gorm:"default:1"`         // Number of users referencing
	Visibility   string    `gorm:"default:'private'"` // private, public, shared
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

type UserFile struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID     uuid.UUID `gorm:"not null;index"`
	FileID     uuid.UUID `gorm:"not null;index"`
	Role       string    `gorm:"default:'owner'"` // owner/editor/viewer
	UploadedAt time.Time `gorm:"autoCreateTime"`

	File File `gorm:"foreignKey:FileID"`
}
