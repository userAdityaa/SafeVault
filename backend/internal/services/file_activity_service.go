package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type FileActivityService struct {
	FileActivityRepo repository.FileActivityRepository
	FileRepo         repository.FileRepository
}

func NewFileActivityService(fileActivityRepo repository.FileActivityRepository, fileRepo repository.FileRepository) *FileActivityService {
	return &FileActivityService{
		FileActivityRepo: fileActivityRepo,
		FileRepo:         fileRepo,
	}
}

func (s *FileActivityService) TrackFileActivity(ctx context.Context, userID, fileID uuid.UUID, activityType string) error {
	if s.FileActivityRepo == nil {
		return fmt.Errorf("file activity repository not configured")
	}

	// Validate activity type
	if activityType != "preview" && activityType != "download" {
		return fmt.Errorf("invalid activity type: %s", activityType)
	}

	// Check if file exists and user has access to it
	userFile, err := s.FileRepo.GetUserFileByFileID(ctx, userID, fileID)
	if err != nil {
		return fmt.Errorf("user does not have access to file: %w", err)
	}
	if userFile == nil {
		return fmt.Errorf("file not found or user does not have access")
	}

	// Track the activity
	err = s.FileActivityRepo.TrackFileActivity(ctx, userID, fileID, activityType)
	if err != nil {
		return fmt.Errorf("failed to track file activity: %w", err)
	}

	return nil
}

func (s *FileActivityService) GetRecentFileActivities(ctx context.Context, userID uuid.UUID, limit int) ([]models.RecentFileActivity, error) {
	if s.FileActivityRepo == nil {
		return nil, fmt.Errorf("file activity repository not configured")
	}

	activities, err := s.FileActivityRepo.GetRecentFileActivities(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent file activities: %w", err)
	}

	return activities, nil
}
