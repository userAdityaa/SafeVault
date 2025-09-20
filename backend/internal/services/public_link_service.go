package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type PublicLinkService struct {
	PublicRepo repository.PublicLinkRepository
	ShareRepo  repository.ShareRepository // reuse for permission checks (file/folder ownership via HasFileAccess / HasFolderAccess semantics)
	UserRepo   repository.UserRepository
	FileRepo   repository.FileRepository
	FolderRepo repository.FolderRepository
}

func NewPublicLinkService(pub repository.PublicLinkRepository, share repository.ShareRepository, user repository.UserRepository, file repository.FileRepository, folder repository.FolderRepository) *PublicLinkService {
	return &PublicLinkService{PublicRepo: pub, ShareRepo: share, UserRepo: user, FileRepo: file, FolderRepo: folder}
}

func generateToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// URL-safe, strip padding
	return strings.TrimRight(base64.URLEncoding.EncodeToString(b), "="), nil
}

func (s *PublicLinkService) CreateFileLink(ctx context.Context, ownerID, fileID uuid.UUID, expiresAt *time.Time) (string, *time.Time, error) {
	// Verify ownership
	has, role, err := s.ShareRepo.HasFileAccess(ctx, ownerID, "", fileID)
	if err != nil || !has || role != "owner" {
		return "", nil, errors.New("not owner of file")
	}
	token, err := generateToken()
	if err != nil {
		return "", nil, err
	}
	if err := s.PublicRepo.CreateFileLink(ctx, fileID, ownerID, token, expiresAt); err != nil {
		return "", nil, err
	}
	return token, expiresAt, nil
}

func (s *PublicLinkService) RevokeFileLink(ctx context.Context, ownerID, fileID uuid.UUID) error {
	has, role, err := s.ShareRepo.HasFileAccess(ctx, ownerID, "", fileID)
	if err != nil || !has || role != "owner" {
		return errors.New("not owner")
	}
	return s.PublicRepo.RevokeFileLink(ctx, fileID)
}

func (s *PublicLinkService) ResolveFileLink(ctx context.Context, token string) (*models.File, *models.User, *time.Time, bool, error) {
	f, owner, expiresAt, revokedAt, err := s.PublicRepo.GetFileLinkResolve(ctx, token)
	if err != nil {
		return nil, nil, nil, false, err
	}
	if revokedAt != nil {
		return nil, nil, nil, true, nil
	}
	if expiresAt != nil && expiresAt.Before(time.Now()) {
		return nil, nil, nil, true, nil
	}
	return f, owner, expiresAt, false, nil
}

func (s *PublicLinkService) CreateFolderLink(ctx context.Context, ownerID, folderID uuid.UUID, expiresAt *time.Time) (string, *time.Time, error) {
	has, role, err := s.ShareRepo.HasFolderAccess(ctx, ownerID, "", folderID)
	if err != nil || !has || role != "owner" {
		return "", nil, errors.New("not owner of folder")
	}
	token, err := generateToken()
	if err != nil {
		return "", nil, err
	}
	if err := s.PublicRepo.CreateFolderLink(ctx, folderID, ownerID, token, expiresAt); err != nil {
		return "", nil, err
	}
	return token, expiresAt, nil
}

func (s *PublicLinkService) RevokeFolderLink(ctx context.Context, ownerID, folderID uuid.UUID) error {
	has, role, err := s.ShareRepo.HasFolderAccess(ctx, ownerID, "", folderID)
	if err != nil || !has || role != "owner" {
		return errors.New("not owner")
	}
	return s.PublicRepo.RevokeFolderLink(ctx, folderID)
}

func (s *PublicLinkService) ResolveFolderLink(ctx context.Context, token string) (*models.Folder, *models.User, *time.Time, bool, error) {
	fo, owner, expiresAt, revokedAt, err := s.PublicRepo.GetFolderLinkResolve(ctx, token)
	if err != nil {
		return nil, nil, nil, false, err
	}
	if revokedAt != nil {
		return nil, nil, nil, true, nil
	}
	if expiresAt != nil && expiresAt.Before(time.Now()) {
		return nil, nil, nil, true, nil
	}
	return fo, owner, expiresAt, false, nil
}

// AddPublicFileToStorage creates user_file mapping if not already present.
func (s *PublicLinkService) AddPublicFileToStorage(ctx context.Context, userID, fileID uuid.UUID) error {
	if s == nil || s.FileRepo == nil {
		return errors.New("file repository not configured")
	}
	// Determine mapping status before attempting to add
	prevStatus, _ := s.FileRepo.GetUserFileMappingStatus(ctx, userID, fileID)
	inserted, err := s.FileRepo.AddUserFile(ctx, userID, fileID, "viewer")
	if err != nil {
		return err
	}
	// Increment ref_count only if this user had no previous mapping (active or deleted) and we inserted a new one
	if prevStatus == "none" && inserted {
		if err := s.FileRepo.IncrementRefCount(ctx, fileID); err != nil {
			return err
		}
	}
	return nil
}
