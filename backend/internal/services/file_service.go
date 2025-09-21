// Package services contains the business logic layer for the SnapVault application.
// Services coordinate between repositories and implement the core application functionality.
package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/minio/minio-go/v7"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

// FileService handles file upload, storage, and retrieval operations.
// It integrates with MinIO for object storage and PostgreSQL for metadata.
// The service implements file deduplication using SHA-256 hashes and enforces user quotas.
type FileService struct {
	// FileRepo provides database operations for file metadata
	FileRepo repository.FileRepository
	// Minio client for object storage operations
	Minio *minio.Client
	// Bucket name in MinIO where files are stored
	Bucket string
	// PublicEndpoint is the public URL for accessing stored files
	PublicEndpoint string
}

// NewFileService creates a new FileService instance with the provided dependencies.
//
// Parameters:
//   - repo: File repository for database operations
//   - minioClient: MinIO client for object storage
//   - bucket: Name of the MinIO bucket to use
//   - publicEndpoint: Public URL endpoint for file access
//
// Returns:
//   - *FileService: Configured file service instance
func NewFileService(repo repository.FileRepository, minioClient *minio.Client, bucket string, publicEndpoint string) *FileService {
	return &FileService{
		FileRepo:       repo,
		Minio:          minioClient,
		Bucket:         bucket,
		PublicEndpoint: publicEndpoint,
	}
}

// perUserQuotaBytes defines the storage quota per user (20 MB)
const perUserQuotaBytes int64 = 20 * 1024 * 1024 // 20 MB

// UploadFiles handles the upload of multiple files for a user.
// It enforces user quotas, deduplicates files by hash, and stores them in MinIO.
// Files are processed sequentially to maintain data consistency.
//
// Parameters:
//   - ctx: Context for cancellation and deadlines
//   - userID: UUID of the user uploading files
//   - uploads: Slice of GraphQL Upload objects containing file data
//
// Returns:
//   - []models.UserFile: List of created user-file associations
//   - error: nil on success, or an error describing what went wrong
func (s *FileService) UploadFiles(ctx context.Context, userID uuid.UUID, uploads []*graphql.Upload) ([]models.UserFile, error) {
	if s == nil || s.Minio == nil || s.Bucket == "" {
		return nil, fmt.Errorf("file storage not configured")
	}
	// Current usage and remaining quota
	currentUsage, err := s.FileRepo.GetUserUsageSum(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage: %w", err)
	}
	remaining := perUserQuotaBytes - currentUsage
	if remaining < 0 {
		remaining = 0
	}

	var results []models.UserFile

	// Check if we have a target folder from context (for folder uploads)
	var targetFolderID *uuid.UUID
	if folderIDValue := ctx.Value("targetFolderID"); folderIDValue != nil {
		fmt.Printf("DEBUG: Context value found, type: %T, value: %v\n", folderIDValue, folderIDValue)
		if folderID, ok := folderIDValue.(uuid.UUID); ok {
			targetFolderID = &folderID
			fmt.Printf("DEBUG: File service received targetFolderID from context: %s\n", folderID.String())
		} else {
			fmt.Printf("DEBUG: Type assertion failed for targetFolderID\n")
		}
	} else {
		fmt.Printf("DEBUG: No targetFolderID found in context\n")
	}

	for _, up := range uploads {
		if up == nil || up.File == nil {
			return nil, fmt.Errorf("invalid upload input")
		}

		// Read into memory, compute hash and size
		buf := &bytes.Buffer{}
		if _, err := io.Copy(buf, up.File); err != nil {
			return nil, err
		}

		// Determine MIME type using declared type and filename extension
		clean := func(s string) string {
			if s == "" {
				return s
			}
			if i := strings.Index(s, ";"); i >= 0 {
				s = s[:i]
			}
			return strings.TrimSpace(strings.ToLower(s))
		}

		declaredBase := clean(up.ContentType)
		extMime := ""
		if ext := strings.ToLower(path.Ext(up.Filename)); ext != "" {
			extMime = clean(mime.TypeByExtension(ext))
		}

		// Determine final MIME type: prioritize declared, fallback to extension-based
		finalMimeType := declaredBase
		if finalMimeType == "" || finalMimeType == "application/octet-stream" {
			if extMime != "" {
				finalMimeType = extMime
			} else {
				// Only use http.DetectContentType as last resort for storage purposes
				peek := buf.Bytes()
				if len(peek) > 512 {
					peek = peek[:512]
				}
				detected := http.DetectContentType(peek)
				finalMimeType = clean(detected)
			}
		}

		// Basic validation: if both declared and extension exist, ensure they're compatible
		if declaredBase != "" && extMime != "" && declaredBase != "application/octet-stream" {
			// Allow some common compatible combinations
			compatible := declaredBase == extMime ||
				(declaredBase == "text/csv" && extMime == "text/plain") ||
				(declaredBase == "text/plain" && extMime == "text/csv") ||
				(strings.HasPrefix(declaredBase, "text/") && strings.HasPrefix(extMime, "text/"))

			if !compatible {
				return nil, fmt.Errorf("declared MIME type (%s) does not match file extension (%s)", declaredBase, extMime)
			}
		}
		sum := sha256.Sum256(buf.Bytes())
		hash := fmt.Sprintf("%x", sum[:])
		sizeBytes := int64(len(buf.Bytes()))

		// If user already has this file (active mapping), create an additional mapping without re-uploading
		if ufExisting, _ := s.FindUserFileByHash(ctx, userID, hash); ufExisting != nil {
			// Ensure the file exists
			dbFile, err := s.FileRepo.FindByHash(ctx, hash)
			if err != nil && err != pgx.ErrNoRows {
				return nil, err
			}
			if dbFile == nil {
				return nil, fmt.Errorf("file record missing for existing mapping")
			}
			// Use folder-aware mapping creation if target folder is specified
			var mappingID uuid.UUID
			if targetFolderID != nil {
				fmt.Printf("DEBUG: Creating user file mapping with folder: %s\n", targetFolderID.String())
				mappingID, err = s.FileRepo.CreateUserFileMappingWithFolder(ctx, userID, dbFile.ID, "owner", targetFolderID)
			} else {
				fmt.Printf("DEBUG: Creating user file mapping without folder (root)\n")
				mappingID, err = s.FileRepo.CreateUserFileMapping(ctx, userID, dbFile.ID, "owner")
			}
			if err != nil {
				return nil, err
			}
			if ufReloaded, err := s.FileRepo.GetUserFileByMappingID(ctx, userID, mappingID); err == nil && ufReloaded != nil {
				results = append(results, *ufReloaded)
				continue
			}
			// Fallback to existing mapping if reload fails
			results = append(results, *ufExisting)
			continue
		}

		// Quota check
		if sizeBytes > remaining {
			return nil, fmt.Errorf("quota exceeded: not enough space for %s (%d bytes left)", up.Filename, remaining)
		}

		// Check if file exists in global files table
		dbFile, err := s.FileRepo.FindByHash(ctx, hash)
		if err != nil && err != pgx.ErrNoRows {
			return nil, err
		}
		if err == pgx.ErrNoRows || dbFile == nil {
			// Upload to MinIO and create file record
			objectName := fmt.Sprintf("files/%s", hash)
			reader := bytes.NewReader(buf.Bytes())
			if _, err := s.Minio.PutObject(ctx, s.Bucket, objectName, reader, sizeBytes, minio.PutObjectOptions{ContentType: finalMimeType}); err != nil {
				return nil, err
			}
			dbFile = &models.File{
				ID:           uuid.New(),
				Hash:         hash,
				StoragePath:  objectName,
				OriginalName: up.Filename,
				MimeType:     finalMimeType,
				Size:         sizeBytes,
				RefCount:     0, // Start with 0, will be incremented when user mapping is created
				Visibility:   "private",
				CreatedAt:    time.Now(),
			}
			if err := s.FileRepo.CreateFile(ctx, dbFile); err != nil {
				return nil, err
			}
		}

		// Map to user
		// Upsert mapping and handle ref_count increment only for first reference by this user
		prevStatus, _ := s.FileRepo.GetUserFileMappingStatus(ctx, userID, dbFile.ID)
		var inserted bool
		if targetFolderID != nil {
			fmt.Printf("DEBUG: Adding user file with folder: %s for existing file\n", targetFolderID.String())
			inserted, err = s.FileRepo.AddUserFileWithFolder(ctx, userID, dbFile.ID, "owner", targetFolderID)
		} else {
			fmt.Printf("DEBUG: Adding user file without folder (root) for existing file\n")
			inserted, err = s.FileRepo.AddUserFile(ctx, userID, dbFile.ID, "owner")
		}
		if err != nil {
			return nil, err
		} else if !inserted {
			if ufExisting, _ := s.FindUserFileByHash(ctx, userID, hash); ufExisting != nil {
				results = append(results, *ufExisting)
				continue
			}
		}
		if prevStatus == "none" {
			if err := s.FileRepo.IncrementRefCount(ctx, dbFile.ID); err != nil {
				return nil, err
			}
			// Update remaining quota only when first mapping is created for this user
			remaining -= sizeBytes
		}

		// Append result by reloading mapping by file id (non-duplicate path)
		if ufReloaded, err := s.FileRepo.GetUserFileByFileID(ctx, userID, dbFile.ID); err == nil && ufReloaded != nil {
			results = append(results, *ufReloaded)
		} else {
			results = append(results, models.UserFile{ID: uuid.New(), UserID: userID, FileID: dbFile.ID, UploadedAt: time.Now(), File: *dbFile})
		}
	}

	return results, nil
}

// GetUserFiles returns files associated with a user.
func (s *FileService) GetUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	if s == nil || s.FileRepo == nil {
		return nil, fmt.Errorf("file service not configured")
	}
	return s.FileRepo.GetUserFiles(ctx, userID)
}

// GetUserUsage returns used bytes and quota
func (s *FileService) GetUserUsage(ctx context.Context, userID uuid.UUID) (used int64, quota int64, err error) {
	if s == nil || s.FileRepo == nil {
		return 0, 0, fmt.Errorf("file service not configured")
	}
	used, err = s.FileRepo.GetUserUsageSum(ctx, userID)
	if err != nil {
		return 0, 0, err
	}
	return used, perUserQuotaBytes, nil
}

// GetUserAttributedUsage returns the user's attributed physical storage usage (sum of size/ref_count)
func (s *FileService) GetUserAttributedUsage(ctx context.Context, userID uuid.UUID) (int64, error) {
	if s == nil || s.FileRepo == nil {
		return 0, fmt.Errorf("file service not configured")
	}
	return s.FileRepo.GetUserAttributedUsage(ctx, userID)
}

// FindUserFileByHash checks if user already has a file with the given content hash
func (s *FileService) FindUserFileByHash(ctx context.Context, userID uuid.UUID, hash string) (*models.UserFile, error) {
	if s == nil || s.FileRepo == nil {
		return nil, fmt.Errorf("file service not configured")
	}
	return s.FileRepo.FindUserFileByHash(ctx, userID, hash)
}

// GetFileURL returns a presigned URL for the given user's file
func (s *FileService) GetFileURL(ctx context.Context, userID, fileID uuid.UUID, inline bool) (string, error) {
	if s == nil || s.FileRepo == nil || s.Minio == nil || s.Bucket == "" {
		return "", fmt.Errorf("file service not configured")
	}
	uf, err := s.FileRepo.GetUserFileByFileID(ctx, userID, fileID)
	if err != nil {
		return "", err
	}
	if uf == nil {
		return "", fmt.Errorf("not found or unauthorized")
	}
	// Prepare response-content-disposition
	dispType := "attachment"
	if inline {
		dispType = "inline"
	}
	reqParams := make(url.Values)
	reqParams.Set("response-content-disposition", fmt.Sprintf("%s; filename=\"%s\"", dispType, uf.File.OriginalName))

	// 10 minute expiry
	expiry := 10 * time.Minute
	u, err := s.Minio.PresignedGetObject(ctx, s.Bucket, uf.File.StoragePath, expiry, reqParams)
	if err != nil {
		return "", err
	}
	// If a public endpoint is configured (e.g., http://localhost:9000), rewrite the scheme+host
	if s.PublicEndpoint != "" {
		if base, perr := url.Parse(s.PublicEndpoint); perr == nil {
			u.Scheme = base.Scheme
			u.Host = base.Host
		}
	}
	return u.String(), nil
}

// SoftDeleteUserFile marks a user-file mapping as deleted (Recently Deleted)
func (s *FileService) SoftDeleteUserFile(ctx context.Context, userID, fileID uuid.UUID) error {
	if s == nil || s.FileRepo == nil {
		return fmt.Errorf("file service not configured")
	}
	// ensure mapping exists
	if _, err := s.FileRepo.GetUserFileByFileID(ctx, userID, fileID); err != nil {
		return err
	}
	return s.FileRepo.MarkUserFileDeleted(ctx, userID, fileID)
}

// RecoverUserFile recovers a soft-deleted file
func (s *FileService) RecoverUserFile(ctx context.Context, userID, fileID uuid.UUID) error {
	if s == nil || s.FileRepo == nil {
		return fmt.Errorf("file service not configured")
	}
	// ensure a deleted mapping exists
	// Note: We check if there's a deleted mapping by trying to get it from deleted files
	deletedFiles, err := s.FileRepo.GetDeletedUserFiles(ctx, userID)
	if err != nil {
		return err
	}

	found := false
	for _, uf := range deletedFiles {
		if uf.FileID == fileID {
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("no deleted file found with ID %s", fileID.String())
	}

	return s.FileRepo.RecoverUserFile(ctx, userID, fileID)
}

// PurgeUserFile permanently removes the mapping and underlying object if unreferenced
func (s *FileService) PurgeUserFile(ctx context.Context, userID, fileID uuid.UUID) error {
	if s == nil || s.FileRepo == nil {
		return fmt.Errorf("file service not configured")
	}
	// ensure mapping exists (even if soft-deleted)
	if _, err := s.FileRepo.GetUserFileByFileID(ctx, userID, fileID); err != nil {
		return err
	}
	// delete mapping
	if err := s.FileRepo.DeleteUserFile(ctx, userID, fileID); err != nil {
		return err
	}
	// decrement refs
	if err := s.FileRepo.DecrementRefCount(ctx, fileID); err != nil {
		return err
	}
	// check file ref count
	f, err := s.FileRepo.GetByID(ctx, fileID)
	if err != nil {
		return err
	}
	if f.RefCount <= 0 {
		// delete from object storage
		if s.Minio == nil || s.Bucket == "" {
			return fmt.Errorf("object storage not configured for purge")
		}
		if err := s.Minio.RemoveObject(ctx, s.Bucket, f.StoragePath, minio.RemoveObjectOptions{}); err != nil {
			return err
		}
		// delete file row
		if err := s.FileRepo.DeleteFileByID(ctx, fileID); err != nil {
			return err
		}
	}
	return nil
}

// SoftDeleteUserFileByMappingID marks a specific user_files row deleted
func (s *FileService) SoftDeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID string) error {
	if s == nil || s.FileRepo == nil {
		return fmt.Errorf("file service not configured")
	}
	mid, err := uuid.Parse(mappingID)
	if err != nil {
		return fmt.Errorf("invalid mapping id")
	}
	return rwrap(s.FileRepo.SoftDeleteUserFileByMappingID(ctx, userID, mid))
}

// PurgeUserFileByMappingID deletes a specific mapping and adjusts file/objects if needed
func (s *FileService) PurgeUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID string) error {
	if s == nil || s.FileRepo == nil {
		return fmt.Errorf("file service not configured")
	}
	mid, err := uuid.Parse(mappingID)
	if err != nil {
		return fmt.Errorf("invalid mapping id")
	}
	// Get file id before delete to adjust ref_count
	uf, err := s.FileRepo.GetUserFileByMappingID(ctx, userID, mid)
	if err != nil {
		return err
	}
	if uf == nil {
		return fmt.Errorf("not found")
	}
	if err := s.FileRepo.DeleteUserFileByMappingID(ctx, userID, mid); err != nil {
		return err
	}
	if err := s.FileRepo.DecrementRefCount(ctx, uf.FileID); err != nil {
		return err
	}
	f, err := s.FileRepo.GetByID(ctx, uf.FileID)
	if err != nil {
		return err
	}
	if f.RefCount <= 0 {
		if s.Minio == nil || s.Bucket == "" {
			return fmt.Errorf("object storage not configured for purge")
		}
		if err := s.Minio.RemoveObject(ctx, s.Bucket, f.StoragePath, minio.RemoveObjectOptions{}); err != nil {
			return err
		}
		if err := s.FileRepo.DeleteFileByID(ctx, uf.FileID); err != nil {
			return err
		}
	}
	return nil
}

// small wrapper to normalize nil error
func rwrap(err error) error { return err }

// GetDeletedUserFiles lists a user's soft-deleted files
func (s *FileService) GetDeletedUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	if s == nil || s.FileRepo == nil {
		return nil, fmt.Errorf("file service not configured")
	}
	return s.FileRepo.GetDeletedUserFiles(ctx, userID)
}

// SearchUserFiles wraps repository search
func (s *FileService) SearchUserFiles(ctx context.Context, userID uuid.UUID, filter repository.SearchFilter, page repository.Page) ([]models.UserFile, *string, int, error) {
	if s == nil || s.FileRepo == nil {
		return nil, nil, 0, fmt.Errorf("file service not configured")
	}
	return s.FileRepo.SearchUserFiles(ctx, userID, filter, page)
}
