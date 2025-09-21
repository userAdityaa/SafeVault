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

	// Check if folder with same name already exists at this level
	existingFolders, err := s.Repo.ListFolders(ctx, userID, parentID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to check existing folders: %w", err)
	}

	for _, folder := range existingFolders {
		if folder.Name == name {
			// Return existing folder ID instead of creating duplicate
			return folder.ID, nil
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

// DeleteFolderRecursive deletes a folder and all its contents recursively
func (s *FolderService) DeleteFolderRecursive(ctx context.Context, userID, folderID uuid.UUID) error {
	return s.Repo.DeleteFolderRecursive(ctx, userID, folderID)
}

// CreateFolderHierarchy creates a nested folder structure from a path
func (s *FolderService) CreateFolderHierarchy(ctx context.Context, userID uuid.UUID, folderPath []string, parentID *uuid.UUID) (uuid.UUID, error) {
	if len(folderPath) == 0 {
		return uuid.Nil, fmt.Errorf("empty folder path")
	}

	currentParentID := parentID
	var currentFolderID uuid.UUID

	for _, folderName := range folderPath {
		if strings.TrimSpace(folderName) == "" {
			continue
		}

		// Check if folder already exists at this level
		folders, err := s.Repo.ListFolders(ctx, userID, currentParentID)
		if err != nil {
			return uuid.Nil, err
		}

		found := false
		for _, folder := range folders {
			if folder.Name == folderName {
				currentFolderID = folder.ID
				currentParentID = &currentFolderID
				found = true
				break
			}
		}

		if !found {
			// Create the folder
			folder, err := s.Repo.CreateFolder(ctx, userID, folderName, currentParentID)
			if err != nil {
				return uuid.Nil, err
			}
			currentFolderID = folder.ID
			currentParentID = &currentFolderID
		}
	}

	return currentFolderID, nil
}
