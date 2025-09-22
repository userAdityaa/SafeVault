package services

import (
	"context"
	"testing"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

// stubFileRepo implements FileRepository methods used by tests with no DB
type stubFileRepo struct{}

func (s *stubFileRepo) FindByHash(ctx context.Context, hash string) (*models.File, error) {
	return nil, nil
}
func (s *stubFileRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.File, error) {
	return &models.File{ID: id}, nil
}
func (s *stubFileRepo) CreateFile(ctx context.Context, file *models.File) error       { return nil }
func (s *stubFileRepo) IncrementRefCount(ctx context.Context, fileID uuid.UUID) error { return nil }
func (s *stubFileRepo) DecrementRefCount(ctx context.Context, fileID uuid.UUID) error { return nil }
func (s *stubFileRepo) AddUserFile(ctx context.Context, userID, fileID uuid.UUID, role string) (bool, error) {
	return true, nil
}
func (s *stubFileRepo) AddUserFileWithFolder(ctx context.Context, userID, fileID uuid.UUID, role string, folderID *uuid.UUID) (bool, error) {
	return true, nil
}
func (s *stubFileRepo) GetUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	return nil, nil
}
func (s *stubFileRepo) DeleteUserFile(ctx context.Context, userID, fileID uuid.UUID) error {
	return nil
}
func (s *stubFileRepo) GetUserUsageSum(ctx context.Context, userID uuid.UUID) (int64, error) {
	return 0, nil
}
func (s *stubFileRepo) GetUserAttributedUsage(ctx context.Context, userID uuid.UUID) (int64, error) {
	return 0, nil
}
func (s *stubFileRepo) FindUserFileByHash(ctx context.Context, userID uuid.UUID, hash string) (*models.UserFile, error) {
	return nil, nil
}
func (s *stubFileRepo) GetUserFileByFileID(ctx context.Context, userID, fileID uuid.UUID) (*models.UserFile, error) {
	return &models.UserFile{UserID: userID, FileID: fileID, File: models.File{ID: fileID}}, nil
}
func (s *stubFileRepo) GetOwnerByFileID(ctx context.Context, fileID uuid.UUID) (*models.UserFile, error) {
	return nil, nil
}
func (s *stubFileRepo) MarkUserFileDeleted(ctx context.Context, userID, fileID uuid.UUID) error {
	return nil
}
func (s *stubFileRepo) RecoverUserFile(ctx context.Context, userID, fileID uuid.UUID) error {
	return nil
}
func (s *stubFileRepo) GetDeletedUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	return nil, nil
}
func (s *stubFileRepo) DeleteFileByID(ctx context.Context, fileID uuid.UUID) error { return nil }
func (s *stubFileRepo) GetUserFileMappingStatus(ctx context.Context, userID, fileID uuid.UUID) (string, error) {
	return "none", nil
}
func (s *stubFileRepo) UserHasActiveMapping(ctx context.Context, userID, fileID uuid.UUID) (bool, error) {
	return false, nil
}
func (s *stubFileRepo) CreateUserFileMapping(ctx context.Context, userID, fileID uuid.UUID, role string) (uuid.UUID, error) {
	return uuid.New(), nil
}
func (s *stubFileRepo) CreateUserFileMappingWithFolder(ctx context.Context, userID, fileID uuid.UUID, role string, folderID *uuid.UUID) (uuid.UUID, error) {
	return uuid.New(), nil
}
func (s *stubFileRepo) GetUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) (*models.UserFile, error) {
	return &models.UserFile{ID: mappingID, UserID: userID}, nil
}
func (s *stubFileRepo) SoftDeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) error {
	return nil
}
func (s *stubFileRepo) DeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) error {
	return nil
}
func (s *stubFileRepo) SearchUserFiles(ctx context.Context, userID uuid.UUID, filter repository.SearchFilter, page repository.Page) ([]models.UserFile, *string, int, error) {
	return nil, nil, 0, nil
}
func (s *stubFileRepo) ListUserFilesInFolder(ctx context.Context, userID uuid.UUID, folderID *uuid.UUID) ([]models.UserFile, error) {
	return nil, nil
}
func (s *stubFileRepo) MoveUserFileToFolder(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID, folderID *uuid.UUID) error {
	return nil
}

func TestFileService_UploadFiles_Unconfigured(t *testing.T) {
	fs := &FileService{}
	_, err := fs.UploadFiles(context.Background(), uuid.New(), []*graphql.Upload{})
	if err == nil {
		t.Fatalf("expected error when storage not configured")
	}
}

func TestFileService_GetUserUsage_NotConfigured(t *testing.T) {
	fs := &FileService{}
	if _, _, err := fs.GetUserUsage(context.Background(), uuid.New()); err == nil {
		t.Fatalf("expected error for unconfigured service")
	}
}

func TestFileService_GetFileURL_NotConfigured(t *testing.T) {
	fs := &FileService{FileRepo: &stubFileRepo{}}
	_, err := fs.GetFileURL(context.Background(), uuid.New(), uuid.New(), true)
	if err == nil {
		t.Fatalf("expected configuration error for GetFileURL")
	}
}

func TestFileService_NewService_Constructs(t *testing.T) {
	fs := NewFileService(&stubFileRepo{}, &minio.Client{}, "bucket", "http://localhost:9000")
	if fs == nil || fs.Bucket != "bucket" {
		t.Fatalf("expected new file service with bucket set")
	}
}
