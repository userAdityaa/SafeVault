package models

import (
	"time"

	"github.com/google/uuid"
)

type AdminUserInfo struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name,omitempty"`
	Picture      string    `json:"picture,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	TotalFiles   int       `json:"totalFiles"`
	TotalFolders int       `json:"totalFolders"`
	StorageUsed  int64     `json:"storageUsed"`
}
