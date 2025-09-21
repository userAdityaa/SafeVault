package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type ShareService struct {
	ShareRepo  repository.ShareRepository
	UserRepo   repository.UserRepository
	FileRepo   repository.FileRepository
	FolderRepo repository.FolderRepository
}

func NewShareService(shareRepo repository.ShareRepository, userRepo repository.UserRepository, fileRepo repository.FileRepository, folderRepo repository.FolderRepository) *ShareService {
	return &ShareService{
		ShareRepo:  shareRepo,
		UserRepo:   userRepo,
		FileRepo:   fileRepo,
		FolderRepo: folderRepo,
	}
}

// ShareFile shares a file with multiple users via email
func (s *ShareService) ShareFile(ctx context.Context, userID uuid.UUID, fileID uuid.UUID, emails []string, permission string, expiresAt *time.Time) ([]models.FileShare, error) {
	// Validate that the user owns the file
	hasAccess, role, err := s.ShareRepo.HasFileAccess(ctx, userID, "", fileID)
	if err != nil {
		return nil, fmt.Errorf("failed to check file access: %w", err)
	}
	if !hasAccess || role != "owner" {
		return nil, fmt.Errorf("you don't have permission to share this file")
	}

	// Validate permission - only viewer is allowed
	if permission != "viewer" {
		return nil, fmt.Errorf("invalid permission: only 'viewer' is allowed")
	}

	var shares []models.FileShare
	var errors []string

	for _, email := range emails {
		email = strings.ToLower(strings.TrimSpace(email))
		if email == "" {
			continue
		}

		// Validate email format (basic validation)
		if !strings.Contains(email, "@") {
			errors = append(errors, fmt.Sprintf("invalid email format: %s", email))
			continue
		}

		// Get user email to prevent sharing with self
		ownerEmail, err := s.UserRepo.GetUserEmailByID(ctx, userID.String())
		if err == nil && ownerEmail == email {
			errors = append(errors, fmt.Sprintf("cannot share with yourself: %s", email))
			continue
		}

		// Create the share
		share, err := s.ShareRepo.CreateFileShare(ctx, fileID, userID, email, permission, expiresAt)
		if err != nil {
			errors = append(errors, fmt.Sprintf("failed to share with %s: %v", email, err))
			continue
		}

		shares = append(shares, *share)
	}

	if len(errors) > 0 && len(shares) == 0 {
		return nil, fmt.Errorf("failed to share with any users: %s", strings.Join(errors, "; "))
	}

	return shares, nil
}

// ShareFolder shares a folder with multiple users via email
func (s *ShareService) ShareFolder(ctx context.Context, userID uuid.UUID, folderID uuid.UUID, emails []string, permission string, expiresAt *time.Time) ([]models.FolderShare, error) {
	// Validate that the user owns the folder
	hasAccess, role, err := s.ShareRepo.HasFolderAccess(ctx, userID, "", folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to check folder access: %w", err)
	}
	if !hasAccess || role != "owner" {
		return nil, fmt.Errorf("you don't have permission to share this folder")
	}

	// Validate permission - only viewer is allowed
	if permission != "viewer" {
		return nil, fmt.Errorf("invalid permission: only 'viewer' is allowed")
	}

	var shares []models.FolderShare
	var errors []string

	for _, email := range emails {
		email = strings.ToLower(strings.TrimSpace(email))
		if email == "" {
			continue
		}

		// Validate email format (basic validation)
		if !strings.Contains(email, "@") {
			errors = append(errors, fmt.Sprintf("invalid email format: %s", email))
			continue
		}

		// Get user email to prevent sharing with self
		ownerEmail, err := s.UserRepo.GetUserEmailByID(ctx, userID.String())
		if err == nil && ownerEmail == email {
			errors = append(errors, fmt.Sprintf("cannot share with yourself: %s", email))
			continue
		}

		// Create the share
		share, err := s.ShareRepo.CreateFolderShare(ctx, folderID, userID, email, permission, expiresAt)
		if err != nil {
			errors = append(errors, fmt.Sprintf("failed to share with %s: %v", email, err))
			continue
		}

		shares = append(shares, *share)
	}

	if len(errors) > 0 && len(shares) == 0 {
		return nil, fmt.Errorf("failed to share with any users: %s", strings.Join(errors, "; "))
	}

	return shares, nil
}

// UnshareFile removes sharing access for a specific email
func (s *ShareService) UnshareFile(ctx context.Context, userID uuid.UUID, fileID uuid.UUID, sharedWithEmail string) error {
	// Validate that the user owns the file
	hasAccess, role, err := s.ShareRepo.HasFileAccess(ctx, userID, "", fileID)
	if err != nil {
		return fmt.Errorf("failed to check file access: %w", err)
	}
	if !hasAccess || role != "owner" {
		return fmt.Errorf("you don't have permission to unshare this file")
	}

	return s.ShareRepo.DeleteFileShare(ctx, fileID, sharedWithEmail)
}

// UnshareFolder removes sharing access for a specific email
func (s *ShareService) UnshareFolder(ctx context.Context, userID uuid.UUID, folderID uuid.UUID, sharedWithEmail string) error {
	// Validate that the user owns the folder
	hasAccess, role, err := s.ShareRepo.HasFolderAccess(ctx, userID, "", folderID)
	if err != nil {
		return fmt.Errorf("failed to check folder access: %w", err)
	}
	if !hasAccess || role != "owner" {
		return fmt.Errorf("you don't have permission to unshare this folder")
	}

	return s.ShareRepo.DeleteFolderShare(ctx, folderID, sharedWithEmail)
}

// GetFileShares gets all shares for a file (only if user owns it)
func (s *ShareService) GetFileShares(ctx context.Context, userID uuid.UUID, fileID uuid.UUID) ([]models.FileShare, error) {
	// Validate that the user owns the file
	hasAccess, role, err := s.ShareRepo.HasFileAccess(ctx, userID, "", fileID)
	if err != nil {
		return nil, fmt.Errorf("failed to check file access: %w", err)
	}
	if !hasAccess || role != "owner" {
		return nil, fmt.Errorf("you don't have permission to view shares for this file")
	}

	return s.ShareRepo.GetFileShares(ctx, fileID)
}

// GetFolderShares gets all shares for a folder (only if user owns it)
func (s *ShareService) GetFolderShares(ctx context.Context, userID uuid.UUID, folderID uuid.UUID) ([]models.FolderShare, error) {
	// Validate that the user owns the folder
	hasAccess, role, err := s.ShareRepo.HasFolderAccess(ctx, userID, "", folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to check folder access: %w", err)
	}
	if !hasAccess || role != "owner" {
		return nil, fmt.Errorf("you don't have permission to view shares for this folder")
	}

	return s.ShareRepo.GetFolderShares(ctx, folderID)
}

// GetSharedFilesWithMe gets all files shared with the current user
func (s *ShareService) GetSharedFilesWithMe(ctx context.Context, userID uuid.UUID) ([]models.FileShare, error) {
	userEmail, err := s.UserRepo.GetUserEmailByID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get user email: %w", err)
	}

	return s.ShareRepo.GetFileSharesForUser(ctx, userEmail)
}

// GetSharedFoldersWithMe gets all folders shared with the current user
func (s *ShareService) GetSharedFoldersWithMe(ctx context.Context, userID uuid.UUID) ([]models.FolderShare, error) {
	userEmail, err := s.UserRepo.GetUserEmailByID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get user email: %w", err)
	}

	return s.ShareRepo.GetFolderSharesForUser(ctx, userEmail)
}

// HasFolderAccess checks if a user has access to a folder (either as owner or via sharing)
func (s *ShareService) HasFolderAccess(ctx context.Context, userID uuid.UUID, userEmail string, folderID uuid.UUID) (bool, string, error) {
	return s.ShareRepo.HasFolderAccess(ctx, userID, userEmail, folderID)
}

// GetSharedFolderFiles gets files within a shared folder that the user has access to (direct files only, not recursive)
func (s *ShareService) GetSharedFolderFiles(ctx context.Context, userID uuid.UUID, folderID uuid.UUID) ([]models.UserFile, error) {
	// Get user email for access check
	userEmail, err := s.UserRepo.GetUserEmailByID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get user email: %w", err)
	}

	log.Printf("DEBUG: User %s (%s) trying to access folder %s", userEmail, userID, folderID)

	// Check if user has access to the folder
	hasAccess, role, err := s.HasFolderAccess(ctx, userID, userEmail, folderID)
	if err != nil {
		log.Printf("DEBUG: Access check error: %v", err)
		return nil, fmt.Errorf("failed to check folder access: %w", err)
	}
	if !hasAccess {
		log.Printf("DEBUG: User %s does not have access to folder %s", userEmail, folderID)
		return nil, fmt.Errorf("access denied to folder")
	}

	log.Printf("DEBUG: User %s has %s access to folder %s", userEmail, role, folderID)

	// Get only direct files in the folder (not recursive)
	files, err := s.ShareRepo.GetFolderFiles(ctx, folderID)
	if err != nil {
		log.Printf("DEBUG: Error getting folder files: %v", err)
		return nil, fmt.Errorf("failed to get folder files: %w", err)
	}

	log.Printf("DEBUG: Found %d direct files in folder %s", len(files), folderID)

	return files, nil
}

// GetSharedFolderSubfolders gets direct subfolders within a shared folder that the user has access to
func (s *ShareService) GetSharedFolderSubfolders(ctx context.Context, userID uuid.UUID, folderID uuid.UUID) ([]models.Folder, error) {
	// Get user email for access check
	userEmail, err := s.UserRepo.GetUserEmailByID(ctx, userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get user email: %w", err)
	}

	// Check if user has access to the folder
	hasAccess, _, err := s.HasFolderAccess(ctx, userID, userEmail, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to check folder access: %w", err)
	}
	if !hasAccess {
		return nil, fmt.Errorf("access denied to folder")
	}

	// Get direct subfolders (not recursive) without user_id filtering
	subfolders, err := s.ShareRepo.GetDirectSubfolders(ctx, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get subfolders: %w", err)
	}

	log.Printf("DEBUG: Found %d direct subfolders in shared folder %s", len(subfolders), folderID)

	return subfolders, nil
}

// GetAllFolderFilesRecursively gets all files from a folder and its nested subfolders
func (s *ShareService) GetAllFolderFilesRecursively(ctx context.Context, folderID uuid.UUID) ([]models.UserFile, error) {
	var allFiles []models.UserFile

	log.Printf("DEBUG: GetAllFolderFilesRecursively called for folder %s", folderID)

	// Get files directly in this folder
	files, err := s.ShareRepo.GetFolderFiles(ctx, folderID)
	if err != nil {
		log.Printf("DEBUG: Error getting folder files for %s: %v", folderID, err)
		return nil, fmt.Errorf("failed to get folder files: %w", err)
	}
	log.Printf("DEBUG: Found %d direct files in folder %s", len(files), folderID)
	allFiles = append(allFiles, files...)

	// Get all subfolders
	subfolders, err := s.FolderRepo.GetAllSubfolders(ctx, uuid.Nil, folderID) // We don't filter by user since we're in a sharing context
	if err != nil {
		log.Printf("DEBUG: Error getting subfolders for %s: %v", folderID, err)
		return nil, fmt.Errorf("failed to get subfolders: %w", err)
	}
	log.Printf("DEBUG: Found %d subfolders in folder %s", len(subfolders), folderID)

	// Recursively get files from each subfolder
	for _, subfolder := range subfolders {
		log.Printf("DEBUG: Recursively checking subfolder %s (name: %s)", subfolder.ID, subfolder.Name)
		subfolderFiles, err := s.GetAllFolderFilesRecursively(ctx, subfolder.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get files from subfolder %s: %w", subfolder.ID, err)
		}
		log.Printf("DEBUG: Found %d files in subfolder %s", len(subfolderFiles), subfolder.ID)
		allFiles = append(allFiles, subfolderFiles...)
	}

	log.Printf("DEBUG: Total files found in folder %s (including subfolders): %d", folderID, len(allFiles))
	return allFiles, nil
}

// GetPublicFolderFiles gets files within a public folder (no access check needed since it's public)
func (s *ShareService) GetPublicFolderFiles(ctx context.Context, folderID uuid.UUID) ([]models.UserFile, error) {
	// Get files in the folder and all nested subfolders
	files, err := s.GetAllFolderFilesRecursively(ctx, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get folder files: %w", err)
	}

	return files, nil
}
