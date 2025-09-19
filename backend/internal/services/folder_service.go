package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/repository"
)

type FolderService struct{ Repo repository.FolderRepository }

func NewFolderService(repo repository.FolderRepository) *FolderService {
	return &FolderService{Repo: repo}
}

func (s *FolderService) CreateFolder(ctx context.Context, userID uuid.UUID, name string, parentID *uuid.UUID) (uuid.UUID, error) {
	if strings.TrimSpace(name) == "" {
		return uuid.Nil, fmt.Errorf("folder name required")
	}
	if parentID != nil {
		ok, err := s.Repo.ValidateParent(ctx, userID, *parentID)
		if err != nil {
			return uuid.Nil, err
		}
		if !ok {
			return uuid.Nil, fmt.Errorf("parent not found")
		}
	}
	f, err := s.Repo.CreateFolder(ctx, userID, name, parentID)
	if err != nil {
		return uuid.Nil, err
	}
	return f.ID, nil
}

func (s *FolderService) RenameFolder(ctx context.Context, userID, folderID uuid.UUID, newName string) error {
	if strings.TrimSpace(newName) == "" {
		return fmt.Errorf("name required")
	}
	return s.Repo.RenameFolder(ctx, userID, folderID, newName)
}

func (s *FolderService) DeleteFolder(ctx context.Context, userID, folderID uuid.UUID) error {
	children, err := s.Repo.CountChildren(ctx, userID, folderID)
	if err != nil {
		return err
	}
	if children > 0 {
		return fmt.Errorf("folder not empty: has subfolders")
	}
	return s.Repo.DeleteFolderReassignFiles(ctx, userID, folderID)
}
