package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type AdminService struct {
	UserRepo   repository.UserRepository
	FileRepo   repository.FileRepository
	FolderRepo repository.FolderRepository
}

func NewAdminService(userRepo repository.UserRepository, fileRepo repository.FileRepository, folderRepo repository.FolderRepository) *AdminService {
	return &AdminService{
		UserRepo:   userRepo,
		FileRepo:   fileRepo,
		FolderRepo: folderRepo,
	}
}

func (s *AdminService) GetAllUsers(ctx context.Context) ([]*models.AdminUserInfo, error) {
	return s.UserRepo.GetAllUsers(ctx)
}

func (s *AdminService) GetUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	return s.FileRepo.GetUserFiles(ctx, userID)
}

func (s *AdminService) GetUserFolders(ctx context.Context, userID uuid.UUID) ([]models.Folder, error) {
	return s.FolderRepo.ListFolders(ctx, userID, nil)
}
