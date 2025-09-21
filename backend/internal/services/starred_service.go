package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type StarredService struct {
	StarredRepo repository.StarredRepository
	FileRepo    repository.FileRepository
	FolderRepo  repository.FolderRepository
}

func NewStarredService(starredRepo repository.StarredRepository, fileRepo repository.FileRepository, folderRepo repository.FolderRepository) *StarredService {
	return &StarredService{
		StarredRepo: starredRepo,
		FileRepo:    fileRepo,
		FolderRepo:  folderRepo,
	}
}

// StarFile stars a file for the user
func (s *StarredService) StarFile(ctx context.Context, userID, fileID uuid.UUID) error {
	// TODO: Re-enable access validation after fixing user table issues
	// Verify file exists and user has access to it
	// userFile, err := s.FileRepo.GetUserFileByFileID(ctx, userID, fileID)
	// if err != nil {
	// 	return fmt.Errorf("file not found or access denied")
	// }
	// if userFile == nil {
	// 	return fmt.Errorf("file not found or access denied")
	// }

	return s.StarredRepo.StarItem(ctx, userID, "file", fileID)
}

// UnstarFile unstars a file for the user
func (s *StarredService) UnstarFile(ctx context.Context, userID, fileID uuid.UUID) error {
	return s.StarredRepo.UnstarItem(ctx, userID, "file", fileID)
}

// StarFolder stars a folder for the user
func (s *StarredService) StarFolder(ctx context.Context, userID, folderID uuid.UUID) error {
	// TODO: Re-enable access validation after fixing user table issues
	// Verify folder exists and user owns it
	// folder, err := s.FolderRepo.GetFolderByID(ctx, userID, folderID)
	// if err != nil {
	// 	return fmt.Errorf("folder not found")
	// }
	// if folder == nil {
	// 	return fmt.Errorf("folder not found")
	// }

	return s.StarredRepo.StarItem(ctx, userID, "folder", folderID)
}

// UnstarFolder unstars a folder for the user
func (s *StarredService) UnstarFolder(ctx context.Context, userID, folderID uuid.UUID) error {
	return s.StarredRepo.UnstarItem(ctx, userID, "folder", folderID)
}

// IsFileStarred checks if a file is starred by the user
func (s *StarredService) IsFileStarred(ctx context.Context, userID, fileID uuid.UUID) (bool, error) {
	return s.StarredRepo.IsItemStarred(ctx, userID, "file", fileID)
}

// IsFolderStarred checks if a folder is starred by the user
func (s *StarredService) IsFolderStarred(ctx context.Context, userID, folderID uuid.UUID) (bool, error) {
	return s.StarredRepo.IsItemStarred(ctx, userID, "folder", folderID)
}

// GetStarredFiles returns all starred files for the user
func (s *StarredService) GetStarredFiles(ctx context.Context, userID uuid.UUID) ([]models.StarredFile, error) {
	return s.StarredRepo.GetStarredFiles(ctx, userID)
}

// GetStarredFolders returns all starred folders for the user
func (s *StarredService) GetStarredFolders(ctx context.Context, userID uuid.UUID) ([]models.StarredFolder, error) {
	return s.StarredRepo.GetStarredFolders(ctx, userID)
}

// GetAllStarredItems returns all starred items (files and folders) for the user
func (s *StarredService) GetAllStarredItems(ctx context.Context, userID uuid.UUID) ([]models.StarredItem, error) {
	return s.StarredRepo.GetAllStarredItems(ctx, userID)
}

// GetStarredStatus returns starred status for multiple items at once
func (s *StarredService) GetStarredStatus(ctx context.Context, userID uuid.UUID, items []struct {
	Type string
	ID   uuid.UUID
}) (map[string]bool, error) {
	return s.StarredRepo.GetStarredStatus(ctx, userID, items)
}
