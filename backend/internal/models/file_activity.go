package models

import (
	"time"

	"github.com/google/uuid"
)

// FileActivity represents a user activity on a file (preview or download)
type FileActivity struct {
	ID           uuid.UUID `json:"id" db:"id"`
	FileID       uuid.UUID `json:"file_id" db:"file_id"`
	UserID       uuid.UUID `json:"user_id" db:"user_id"`
	ActivityType string    `json:"activity_type" db:"activity_type"` // "preview" or "download"
	ActivityAt   time.Time `json:"activity_at" db:"activity_at"`
}

// RecentFileActivity represents aggregated recent file activity for a user
type RecentFileActivity struct {
	FileID           uuid.UUID `json:"file_id" db:"file_id"`
	UserID           uuid.UUID `json:"user_id" db:"user_id"`
	LastActivityType string    `json:"last_activity_type" db:"last_activity_type"`
	LastActivityAt   time.Time `json:"last_activity_at" db:"last_activity_at"`
	ActivityCount    int       `json:"activity_count" db:"activity_count"`
}
