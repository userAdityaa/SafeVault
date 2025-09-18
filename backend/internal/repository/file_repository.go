package repository

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type FileRepository interface {
	FindByHash(ctx context.Context, hash string) (*models.File, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.File, error)
	CreateFile(ctx context.Context, file *models.File) error
	IncrementRefCount(ctx context.Context, fileID uuid.UUID) error
	DecrementRefCount(ctx context.Context, fileID uuid.UUID) error
	// Note: userID can be from users or google_users; FK relaxed
	AddUserFile(ctx context.Context, userID, fileID uuid.UUID, role string) (bool, error)
	GetUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error)
	DeleteUserFile(ctx context.Context, userID, fileID uuid.UUID) error
	// New helpers
	GetUserUsageSum(ctx context.Context, userID uuid.UUID) (int64, error)
	GetUserAttributedUsage(ctx context.Context, userID uuid.UUID) (int64, error)
	FindUserFileByHash(ctx context.Context, userID uuid.UUID, hash string) (*models.UserFile, error)
	GetUserFileByFileID(ctx context.Context, userID, fileID uuid.UUID) (*models.UserFile, error)
	MarkUserFileDeleted(ctx context.Context, userID, fileID uuid.UUID) error
	GetDeletedUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error)
	DeleteFileByID(ctx context.Context, fileID uuid.UUID) error
	GetUserFileMappingStatus(ctx context.Context, userID, fileID uuid.UUID) (status string, err error)
	UserHasActiveMapping(ctx context.Context, userID, fileID uuid.UUID) (bool, error)
	// New for duplicate mappings per user
	CreateUserFileMapping(ctx context.Context, userID, fileID uuid.UUID, role string) (uuid.UUID, error)
	GetUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) (*models.UserFile, error)
	SoftDeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) error
	DeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) error
	SearchUserFiles(ctx context.Context, userID uuid.UUID, filter SearchFilter, page Page) (items []models.UserFile, nextCursor *string, total int, err error)
}

type fileRepository struct {
	DB *pgxpool.Pool
}

func NewFileRepository(db *pgxpool.Pool) FileRepository {
	return &fileRepository{DB: db}
}

// Search filters and pagination
type SearchFilter struct {
	Filename      *string
	MimeTypes     []string
	SizeMin       *int64
	SizeMax       *int64
	CreatedAfter  *time.Time
	CreatedBefore *time.Time
	Tags          []string
	UploaderName  *string
}

type Page struct {
	Limit  int
	Cursor *string
}

// Find file by hash
func (r *fileRepository) FindByHash(ctx context.Context, hash string) (*models.File, error) {
	query := `SELECT id, hash, storage_path, original_name, mime_type, size, ref_count, visibility, created_at 
	          FROM files WHERE hash=$1`
	row := r.DB.QueryRow(ctx, query, hash)
	file := &models.File{}
	err := row.Scan(&file.ID, &file.Hash, &file.StoragePath, &file.OriginalName, &file.MimeType,
		&file.Size, &file.RefCount, &file.Visibility, &file.CreatedAt)
	if err != nil {
		return nil, err
	}
	return file, nil
}

// Get file by ID
func (r *fileRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.File, error) {
	row := r.DB.QueryRow(ctx, `SELECT id, hash, storage_path, original_name, mime_type, size, ref_count, visibility, created_at FROM files WHERE id=$1`, id)
	var f models.File
	if err := row.Scan(&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt); err != nil {
		return nil, err
	}
	return &f, nil
}

// Create file
func (r *fileRepository) CreateFile(ctx context.Context, file *models.File) error {
	query := `INSERT INTO files (id, hash, storage_path, original_name, mime_type, size, ref_count, visibility, created_at)
	          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`
	_, err := r.DB.Exec(ctx, query, file.ID, file.Hash, file.StoragePath, file.OriginalName,
		file.MimeType, file.Size, file.RefCount, file.Visibility, time.Now())
	return err
}

// Increment ref_count
func (r *fileRepository) IncrementRefCount(ctx context.Context, fileID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `UPDATE files SET ref_count = ref_count + 1 WHERE id=$1`, fileID)
	return err
}

// Decrement ref_count
func (r *fileRepository) DecrementRefCount(ctx context.Context, fileID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `UPDATE files SET ref_count = GREATEST(ref_count - 1, 0) WHERE id=$1`, fileID)
	return err
}

// Map file to user
func (r *fileRepository) AddUserFile(ctx context.Context, userID, fileID uuid.UUID, role string) (bool, error) {
	// Try to restore the most recent soft-deleted mapping first
	var restoredID uuid.UUID
	err := r.DB.QueryRow(ctx, `
		UPDATE user_files uf
		SET deleted_at = NULL, uploaded_at = $3, role = $4
		WHERE uf.id = (
			SELECT id FROM user_files
			WHERE user_id = $1 AND file_id = $2 AND deleted_at IS NOT NULL
			ORDER BY uploaded_at DESC
			LIMIT 1
		)
		RETURNING uf.id
	`, userID, fileID, time.Now(), role).Scan(&restoredID)
	if err == nil {
		// restored one mapping
		return true, nil
	}
	// Check if there is any active mapping already
	var activeID uuid.UUID
	err = r.DB.QueryRow(ctx, `SELECT id FROM user_files WHERE user_id=$1 AND file_id=$2 AND deleted_at IS NULL LIMIT 1`, userID, fileID).Scan(&activeID)
	if err == nil {
		// active mapping exists; not inserted
		return false, nil
	}
	// No active mapping and nothing to restore; insert a new mapping
	id := uuid.New()
	if _, err := r.DB.Exec(ctx, `INSERT INTO user_files (id, user_id, file_id, role, uploaded_at) VALUES ($1,$2,$3,$4,$5)`, id, userID, fileID, role, time.Now()); err != nil {
		return false, err
	}
	return true, nil
}

// CreateUserFileMapping inserts a new mapping row regardless of existing ones
func (r *fileRepository) CreateUserFileMapping(ctx context.Context, userID, fileID uuid.UUID, role string) (uuid.UUID, error) {
	id := uuid.New()
	_, err := r.DB.Exec(ctx, `INSERT INTO user_files (id, user_id, file_id, role, uploaded_at) VALUES ($1,$2,$3,$4,$5)`, id, userID, fileID, role, time.Now())
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

// Get all files of a user
func (r *fileRepository) GetUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	query := `SELECT uf.id, uf.user_id, uf.file_id, uf.role, uf.uploaded_at,
					 f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
					 COALESCE(u.email, gu.email, '') AS uploader_email,
					 NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
					 NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture
			  FROM user_files uf
			  JOIN files f ON uf.file_id=f.id
			  LEFT JOIN users u ON uf.user_id = u.id
			  LEFT JOIN google_users gu ON uf.user_id = gu.id
			  WHERE uf.user_id=$1 AND uf.deleted_at IS NULL`
	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.UserFile
	for rows.Next() {
		var uf models.UserFile
		var f models.File
		err := rows.Scan(&uf.ID, &uf.UserID, &uf.FileID, &uf.Role, &uf.UploadedAt,
			&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt,
			&uf.UploaderEmail, &uf.UploaderName, &uf.UploaderPicture)
		if err != nil {
			return nil, err
		}
		uf.File = f
		result = append(result, uf)
	}
	return result, nil
}

// Delete user-file mapping
func (r *fileRepository) DeleteUserFile(ctx context.Context, userID, fileID uuid.UUID) error {
	// Delete only one (the most recent) mapping for this user and file
	_, err := r.DB.Exec(ctx, `
		DELETE FROM user_files uf
		WHERE uf.id = (
			SELECT id FROM user_files
			WHERE user_id=$1 AND file_id=$2 AND deleted_at IS NOT NULL
			ORDER BY uploaded_at DESC
			LIMIT 1
		)
	`, userID, fileID)
	return err
}

// MarkUserFileDeleted marks mapping as soft-deleted
func (r *fileRepository) MarkUserFileDeleted(ctx context.Context, userID, fileID uuid.UUID) error {
	// Mark only one (the most recent) active mapping as deleted
	_, err := r.DB.Exec(ctx, `
		UPDATE user_files uf
		SET deleted_at = NOW()
		WHERE uf.id = (
			SELECT id FROM user_files
			WHERE user_id=$1 AND file_id=$2 AND deleted_at IS NULL
			ORDER BY uploaded_at DESC
			LIMIT 1
		)
	`, userID, fileID)
	return err
}

// GetDeletedUserFiles returns soft-deleted mappings
func (r *fileRepository) GetDeletedUserFiles(ctx context.Context, userID uuid.UUID) ([]models.UserFile, error) {
	query := `SELECT uf.id, uf.user_id, uf.file_id, uf.role, uf.uploaded_at,
					 f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
					 COALESCE(u.email, gu.email, '') AS uploader_email,
					 NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
					 NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture
			  FROM user_files uf
			  JOIN files f ON uf.file_id=f.id
			  LEFT JOIN users u ON uf.user_id = u.id
			  LEFT JOIN google_users gu ON uf.user_id = gu.id
			  WHERE uf.user_id=$1 AND uf.deleted_at IS NOT NULL`
	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []models.UserFile
	for rows.Next() {
		var uf models.UserFile
		var f models.File
		if err := rows.Scan(&uf.ID, &uf.UserID, &uf.FileID, &uf.Role, &uf.UploadedAt,
			&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt,
			&uf.UploaderEmail, &uf.UploaderName, &uf.UploaderPicture); err != nil {
			return nil, err
		}
		uf.File = f
		result = append(result, uf)
	}
	return result, nil
}

// DeleteFileByID hard-deletes file row
func (r *fileRepository) DeleteFileByID(ctx context.Context, fileID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `DELETE FROM files WHERE id=$1`, fileID)
	return err
}

// GetUserUsageSum returns total bytes used by a user (sum of sizes of their files)
func (r *fileRepository) GetUserUsageSum(ctx context.Context, userID uuid.UUID) (int64, error) {
	row := r.DB.QueryRow(ctx, `
		SELECT COALESCE(SUM(f.size),0)
		FROM files f
		JOIN (
			SELECT DISTINCT file_id FROM user_files WHERE user_id=$1 AND deleted_at IS NULL
		) d ON d.file_id = f.id
	`, userID)
	var sum int64
	if err := row.Scan(&sum); err != nil {
		return 0, err
	}
	return sum, nil
}

// GetUserAttributedUsage returns user's attributed physical storage usage (sum of size/ref_count per file mapping)
func (r *fileRepository) GetUserAttributedUsage(ctx context.Context, userID uuid.UUID) (int64, error) {
	// Use integer division for bytes; protects against division by zero with GREATEST
	row := r.DB.QueryRow(ctx, `
		SELECT COALESCE(SUM(f.size / GREATEST(f.ref_count, 1)), 0)
		FROM user_files uf
		JOIN files f ON uf.file_id = f.id
		WHERE uf.user_id = $1 AND uf.deleted_at IS NULL
	`, userID)
	var sum int64
	if err := row.Scan(&sum); err != nil {
		return 0, err
	}
	return sum, nil
}

// FindUserFileByHash locates a file mapping for a user by content hash
func (r *fileRepository) FindUserFileByHash(ctx context.Context, userID uuid.UUID, hash string) (*models.UserFile, error) {
	query := `SELECT uf.id, uf.user_id, uf.file_id, uf.role, uf.uploaded_at,
					 f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
			COALESCE(u.email, gu.email, '') AS uploader_email,
					 NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
					 NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture
			  FROM user_files uf
			  JOIN files f ON uf.file_id=f.id
			  LEFT JOIN users u ON uf.user_id = u.id
			  LEFT JOIN google_users gu ON uf.user_id = gu.id
		WHERE uf.user_id=$1 AND f.hash=$2 AND uf.deleted_at IS NULL`
	row := r.DB.QueryRow(ctx, query, userID, hash)
	var uf models.UserFile
	var f models.File
	if err := row.Scan(&uf.ID, &uf.UserID, &uf.FileID, &uf.Role, &uf.UploadedAt,
		&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt,
		&uf.UploaderEmail, &uf.UploaderName, &uf.UploaderPicture); err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	uf.File = f
	return &uf, nil
}

// GetUserFileByFileID locates a user-file mapping and joins file by file ID
func (r *fileRepository) GetUserFileByFileID(ctx context.Context, userID, fileID uuid.UUID) (*models.UserFile, error) {
	query := `SELECT uf.id, uf.user_id, uf.file_id, uf.role, uf.uploaded_at,
					 f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
					 COALESCE(u.email, gu.email, '') AS uploader_email,
					 NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
					 NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture
			  FROM user_files uf
			  JOIN files f ON uf.file_id=f.id
			  LEFT JOIN users u ON uf.user_id = u.id
			  LEFT JOIN google_users gu ON uf.user_id = gu.id
			  WHERE uf.user_id=$1 AND uf.file_id=$2`
	row := r.DB.QueryRow(ctx, query, userID, fileID)
	var uf models.UserFile
	var f models.File
	if err := row.Scan(&uf.ID, &uf.UserID, &uf.FileID, &uf.Role, &uf.UploadedAt,
		&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt,
		&uf.UploaderEmail, &uf.UploaderName, &uf.UploaderPicture); err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	uf.File = f
	return &uf, nil
}

// GetUserFileByMappingID fetches a mapping by its id
func (r *fileRepository) GetUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) (*models.UserFile, error) {
	query := `SELECT uf.id, uf.user_id, uf.file_id, uf.role, uf.uploaded_at,
					 f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
					 COALESCE(u.email, gu.email, '') AS uploader_email,
					 NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
					 NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture
			  FROM user_files uf
			  JOIN files f ON uf.file_id=f.id
			  LEFT JOIN users u ON uf.user_id = u.id
			  LEFT JOIN google_users gu ON uf.user_id = gu.id
			  WHERE uf.user_id=$1 AND uf.id=$2`
	row := r.DB.QueryRow(ctx, query, userID, mappingID)
	var uf models.UserFile
	var f models.File
	if err := row.Scan(&uf.ID, &uf.UserID, &uf.FileID, &uf.Role, &uf.UploadedAt,
		&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt,
		&uf.UploaderEmail, &uf.UploaderName, &uf.UploaderPicture); err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	uf.File = f
	return &uf, nil
}

// SoftDeleteUserFileByMappingID soft-deletes a mapping by id
func (r *fileRepository) SoftDeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `UPDATE user_files SET deleted_at = NOW() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`, mappingID, userID)
	return err
}

// DeleteUserFileByMappingID hard-deletes mapping by id
func (r *fileRepository) DeleteUserFileByMappingID(ctx context.Context, userID uuid.UUID, mappingID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `DELETE FROM user_files WHERE id=$1 AND user_id=$2`, mappingID, userID)
	return err
}

// SearchUserFiles implements combined filters with keyset pagination by (uploaded_at,id)
func (r *fileRepository) SearchUserFiles(ctx context.Context, userID uuid.UUID, filter SearchFilter, page Page) ([]models.UserFile, *string, int, error) {
	// Base query selects active mappings for the user
	sb := strings.Builder{}
	countSB := strings.Builder{}
	args := []interface{}{userID}
	arg := func(v interface{}) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}
	// Filtering CTEs and joins
	baseCTE := `WITH base AS (
		SELECT uf.id AS mapping_id, uf.user_id, uf.file_id, uf.role, uf.uploaded_at
		FROM user_files uf
		WHERE uf.user_id = $1 AND uf.deleted_at IS NULL
    )`
	joinSQL := `
    SELECT b.mapping_id, b.user_id, b.file_id, b.role, b.uploaded_at,
		   f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
		   COALESCE(u.email, gu.email, '') AS uploader_email,
		   NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
		   NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture
	FROM base b
	JOIN files f ON f.id = b.file_id
	LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN google_users gu ON b.user_id = gu.id`
	sb.WriteString(baseCTE)
	sb.WriteString(joinSQL)
	countSB.WriteString(baseCTE)
	countSB.WriteString(strings.Replace(joinSQL, `SELECT b.mapping_id, b.user_id, b.file_id, b.role, b.uploaded_at,
	    f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
	    COALESCE(u.email, gu.email, '') AS uploader_email,
	    NULLIF(COALESCE(gu.name, ''), '') AS uploader_name,
	    NULLIF(COALESCE(gu.picture, ''), '') AS uploader_picture`, "SELECT 1", 1))

	// Dynamic WHERE filters
	where := []string{}
	if filter.Filename != nil && *filter.Filename != "" {
		where = append(where, fmt.Sprintf("f.original_name ILIKE '%%' || %s || '%%'", arg(*filter.Filename)))
	}
	if len(filter.MimeTypes) > 0 {
		where = append(where, fmt.Sprintf("f.mime_type = ANY(%s)", arg(filter.MimeTypes)))
	}
	if filter.SizeMin != nil {
		where = append(where, fmt.Sprintf("f.size >= %s", arg(*filter.SizeMin)))
	}
	if filter.SizeMax != nil {
		where = append(where, fmt.Sprintf("f.size <= %s", arg(*filter.SizeMax)))
	}
	if filter.CreatedAfter != nil {
		where = append(where, fmt.Sprintf("f.created_at >= %s", arg(*filter.CreatedAfter)))
	}
	if filter.CreatedBefore != nil {
		where = append(where, fmt.Sprintf("f.created_at <= %s", arg(*filter.CreatedBefore)))
	}
	if len(filter.Tags) > 0 {
		// Require all provided tags to be present on file (intersection via HAVING count)
		joinTags := `
		JOIN (
			SELECT ft.file_id
			FROM file_tags ft
			JOIN tags t ON t.id = ft.tag_id
			WHERE t.name = ANY(` + arg(filter.Tags) + `)
			GROUP BY ft.file_id
			HAVING COUNT(DISTINCT t.name) = ` + fmt.Sprintf("%d", len(filter.Tags)) + `
		) tagf ON tagf.file_id = b.file_id`
		sb.WriteString(joinTags)
		countSB.WriteString(joinTags)
	}
	if filter.UploaderName != nil && *filter.UploaderName != "" {
		where = append(where, fmt.Sprintf("(gu.name ILIKE '%%' || %s || '%%')", arg(*filter.UploaderName)))
	}

	if len(where) > 0 {
		whereSQL := "\nWHERE " + strings.Join(where, " AND ")
		sb.WriteString(whereSQL)
		countSB.WriteString(whereSQL)
	}

	// Keyset pagination
	// Cursor format: uploaded_at RFC3339NANO + ":" + mapping_id
	if page.Cursor != nil && *page.Cursor != "" {
		var ts time.Time
		var mid uuid.UUID
		// Expect format "<unix_nano>:<uuid>" for stability
		parts := strings.SplitN(*page.Cursor, ":", 2)
		if len(parts) == 2 {
			if ns, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
				ts = time.Unix(0, ns)
			}
			if id, err := uuid.Parse(parts[1]); err == nil {
				mid = id
			}
		}
		if !ts.IsZero() && mid != uuid.Nil {
			where2 := ""
			if len(where) > 0 {
				where2 = " AND "
			}
			sb.WriteString(where2 + fmt.Sprintf("(b.uploaded_at, b.mapping_id) < (%s, %s)", arg(ts), arg(mid)))
		}
	}

	sb.WriteString("\nORDER BY b.uploaded_at DESC, b.mapping_id DESC")
	limit := 50
	if page.Limit > 0 && page.Limit <= 200 {
		limit = page.Limit
	}
	sb.WriteString("\nLIMIT " + fmt.Sprintf("%d", limit+1))

	// Total count (without pagination) for UI; keep approximate by separate query for performance
	// Note: count respects same filters but without LIMIT/OFFSET
	countSQL := countSB.String()
	countSQL = countSQL + "\nSELECT COUNT(*) FROM (" + strings.Replace(countSB.String(), "SELECT 1", "SELECT 1", 1) + ") _x"

	// Run main query
	rows, err := r.DB.Query(ctx, sb.String(), args...)
	if err != nil {
		return nil, nil, 0, err
	}
	defer rows.Close()

	out := []models.UserFile{}
	var lastUploaded time.Time
	var lastID uuid.UUID
	for rows.Next() {
		var uf models.UserFile
		var f models.File
		if err := rows.Scan(&uf.ID, &uf.UserID, &uf.FileID, &uf.Role, &uf.UploadedAt,
			&f.ID, &f.Hash, &f.StoragePath, &f.OriginalName, &f.MimeType, &f.Size, &f.RefCount, &f.Visibility, &f.CreatedAt,
			&uf.UploaderEmail, &uf.UploaderName, &uf.UploaderPicture); err != nil {
			return nil, nil, 0, err
		}
		uf.File = f
		out = append(out, uf)
		lastUploaded = uf.UploadedAt
		lastID = uf.ID
	}

	var nextCursor *string
	if len(out) > limit {
		// trim extra and set cursor
		out = out[:limit]
		cursor := fmt.Sprintf("%d:%s", lastUploaded.UnixNano(), lastID.String())
		nextCursor = &cursor
	}

	// Get total count
	var total int
	if err := r.DB.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		// If count fails, degrade gracefully
		total = 0
	}

	return out, nextCursor, total, nil
}

// GetUserFileMappingStatus returns one of: "none", "active", "deleted"
func (r *fileRepository) GetUserFileMappingStatus(ctx context.Context, userID, fileID uuid.UUID) (string, error) {
	row := r.DB.QueryRow(ctx, `SELECT deleted_at IS NULL FROM user_files WHERE user_id=$1 AND file_id=$2 LIMIT 1`, userID, fileID)
	var isActive *bool
	// Use a nullable bool to detect no rows via scan error
	err := row.Scan(&isActive)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return "none", nil
		}
		return "", err
	}
	if isActive == nil {
		return "none", nil
	}
	if *isActive {
		return "active", nil
	}
	return "deleted", nil
}

// UserHasActiveMapping checks if user has any non-deleted mapping for a given file
func (r *fileRepository) UserHasActiveMapping(ctx context.Context, userID, fileID uuid.UUID) (bool, error) {
	row := r.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM user_files WHERE user_id=$1 AND file_id=$2 AND deleted_at IS NULL)`, userID, fileID)
	var exists bool
	if err := row.Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}
