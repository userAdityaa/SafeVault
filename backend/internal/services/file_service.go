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

type FileService struct {
	FileRepo       repository.FileRepository
	Minio          *minio.Client
	Bucket         string
	PublicEndpoint string
}

func NewFileService(repo repository.FileRepository, minioClient *minio.Client, bucket string, publicEndpoint string) *FileService {
	return &FileService{
		FileRepo:       repo,
		Minio:          minioClient,
		Bucket:         bucket,
		PublicEndpoint: publicEndpoint,
	}
}

const perUserQuotaBytes int64 = 20 * 1024 * 1024 // 20 MB

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
	for _, up := range uploads {
		if up == nil || up.File == nil {
			return nil, fmt.Errorf("invalid upload input")
		}

		// Read into memory, compute hash and size
		buf := &bytes.Buffer{}
		if _, err := io.Copy(buf, up.File); err != nil {
			return nil, err
		}

		// Validate MIME type against declared and filename extension
		peek := buf.Bytes()
		if len(peek) > 512 {
			peek = peek[:512]
		}
		detected := http.DetectContentType(peek)
		clean := func(s string) string {
			if s == "" {
				return s
			}
			if i := strings.Index(s, ";"); i >= 0 {
				s = s[:i]
			}
			return strings.TrimSpace(strings.ToLower(s))
		}
		detectedBase := clean(detected)
		declaredBase := clean(up.ContentType)
		extMime := ""
		if ext := strings.ToLower(path.Ext(up.Filename)); ext != "" {
			extMime = clean(mime.TypeByExtension(ext))
		}
		// If declared is present and not generic, require match with detected
		if declaredBase != "" && declaredBase != "application/octet-stream" && declaredBase != detectedBase {
			return nil, fmt.Errorf("content-type mismatch: declared %s, detected %s", declaredBase, detectedBase)
		}
		// If extension implies a type and it contradicts detection, reject
		if extMime != "" && extMime != detectedBase {
			return nil, fmt.Errorf("file extension does not match content: ext=%s, detected=%s", extMime, detectedBase)
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
			mappingID, err := s.FileRepo.CreateUserFileMapping(ctx, userID, dbFile.ID, "owner")
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
			if _, err := s.Minio.PutObject(ctx, s.Bucket, objectName, reader, sizeBytes, minio.PutObjectOptions{ContentType: detectedBase}); err != nil {
				return nil, err
			}
			dbFile = &models.File{
				ID:           uuid.New(),
				Hash:         hash,
				StoragePath:  objectName,
				OriginalName: up.Filename,
				MimeType:     up.ContentType,
				Size:         sizeBytes,
				RefCount:     1,
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
		if inserted, err := s.FileRepo.AddUserFile(ctx, userID, dbFile.ID, "owner"); err != nil {
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
