package models

import (
	"time"

	"github.com/google/uuid"
)

// FileDownload tracks download events for files accessed through shares or public links
type FileDownload struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	FileID       uuid.UUID  `gorm:"not null;index"`
	DownloadedBy *uuid.UUID `gorm:"index"` // NULL for anonymous public link downloads
	OwnerID      uuid.UUID  `gorm:"not null;index"`
	DownloadType string     `gorm:"not null"` // "shared" or "public"
	ShareToken   *string    `gorm:"index"`    // For public link downloads
	IPAddress    string     `gorm:"size:45"`  // IPv4 or IPv6
	UserAgent    string     `gorm:"size:512"`
	DownloadedAt time.Time  `gorm:"autoCreateTime;index"`

	File           File  `gorm:"foreignKey:FileID"`
	DownloadedUser *User `gorm:"foreignKey:DownloadedBy"`
	Owner          User  `gorm:"foreignKey:OwnerID"`
}

// FileDownloadStats aggregates download statistics for admin view
type FileDownloadStats struct {
	FileID          uuid.UUID `gorm:"not null"`
	OwnerID         uuid.UUID `gorm:"not null"`
	TotalDownloads  int64     `gorm:"not null"`
	SharedDownloads int64     `gorm:"not null"`
	PublicDownloads int64     `gorm:"not null"`
	LastDownloadAt  *time.Time

	File  File `gorm:"foreignKey:FileID"`
	Owner User `gorm:"foreignKey:OwnerID"`
}
