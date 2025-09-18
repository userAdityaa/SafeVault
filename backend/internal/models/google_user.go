package models

import (
	"time"

	"github.com/google/uuid"
)

type GoogleUser struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email     string    `gorm:"uniqueIndex;not null"`
	Name      string    `gorm:"default:''"`
	Picture   string    `gorm:"default:''"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
