package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type ShareRepository interface {
	// File sharing
	CreateFileShare(ctx context.Context, fileID, ownerID uuid.UUID, sharedWithEmail string, permission string, expiresAt *time.Time) (*models.FileShare, error)
	GetFileShares(ctx context.Context, fileID uuid.UUID) ([]models.FileShare, error)
	GetFileSharesForUser(ctx context.Context, userEmail string) ([]models.FileShare, error)
	DeleteFileShare(ctx context.Context, fileID uuid.UUID, sharedWithEmail string) error

	// Folder sharing
	CreateFolderShare(ctx context.Context, folderID, ownerID uuid.UUID, sharedWithEmail string, permission string, expiresAt *time.Time) (*models.FolderShare, error)
	GetFolderShares(ctx context.Context, folderID uuid.UUID) ([]models.FolderShare, error)
	GetFolderSharesForUser(ctx context.Context, userEmail string) ([]models.FolderShare, error)
	DeleteFolderShare(ctx context.Context, folderID uuid.UUID, sharedWithEmail string) error

	// Check permissions
	HasFileAccess(ctx context.Context, userID uuid.UUID, userEmail string, fileID uuid.UUID) (bool, string, error)
	HasFolderAccess(ctx context.Context, userID uuid.UUID, userEmail string, folderID uuid.UUID) (bool, string, error)

	// Get folder contents
	GetFolderFiles(ctx context.Context, folderID uuid.UUID) ([]models.UserFile, error)
	GetDirectSubfolders(ctx context.Context, folderID uuid.UUID) ([]models.Folder, error)
}

type shareRepository struct {
	DB *pgxpool.Pool
}

func NewShareRepository(db *pgxpool.Pool) ShareRepository {
	return &shareRepository{DB: db}
}

func (r *shareRepository) CreateFileShare(ctx context.Context, fileID, ownerID uuid.UUID, sharedWithEmail string, permission string, expiresAt *time.Time) (*models.FileShare, error) {
	id := uuid.New()
	query := `INSERT INTO file_shares (id, file_id, owner_id, shared_with_email, permission, shared_at, expires_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)
	          ON CONFLICT (file_id, shared_with_email) 
	          DO UPDATE SET permission = EXCLUDED.permission, expires_at = EXCLUDED.expires_at
	          RETURNING id`

	err := r.DB.QueryRow(ctx, query, id, fileID, ownerID, sharedWithEmail, permission, time.Now(), expiresAt).Scan(&id)
	if err != nil {
		return nil, err
	}

	// Load the complete share with related data
	return r.getFileShareByID(ctx, id)
}

func (r *shareRepository) getFileShareByID(ctx context.Context, shareID uuid.UUID) (*models.FileShare, error) {
	query := `SELECT fs.id, fs.file_id, fs.owner_id, fs.shared_with_email, fs.shared_with_id, 
	                 fs.permission, fs.shared_at, fs.expires_at,
	                 f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at
	          FROM file_shares fs
	          JOIN files f ON fs.file_id = f.id
	          WHERE fs.id = $1`

	var share models.FileShare
	var file models.File

	err := r.DB.QueryRow(ctx, query, shareID).Scan(
		&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithEmail, &share.SharedWithID,
		&share.Permission, &share.SharedAt, &share.ExpiresAt,
		&file.ID, &file.Hash, &file.OriginalName, &file.MimeType, &file.Size,
		&file.RefCount, &file.Visibility, &file.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	share.File = file
	return &share, nil
}

func (r *shareRepository) GetFileShares(ctx context.Context, fileID uuid.UUID) ([]models.FileShare, error) {
	query := `SELECT fs.id, fs.file_id, fs.owner_id, fs.shared_with_email, fs.shared_with_id, 
	                 fs.permission, fs.shared_at, fs.expires_at,
	                 f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at
	          FROM file_shares fs
	          JOIN files f ON fs.file_id = f.id
	          WHERE fs.file_id = $1`

	rows, err := r.DB.Query(ctx, query, fileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []models.FileShare
	for rows.Next() {
		var share models.FileShare
		var file models.File

		err := rows.Scan(
			&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithEmail, &share.SharedWithID,
			&share.Permission, &share.SharedAt, &share.ExpiresAt,
			&file.ID, &file.Hash, &file.OriginalName, &file.MimeType, &file.Size,
			&file.RefCount, &file.Visibility, &file.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		share.File = file
		shares = append(shares, share)
	}

	return shares, nil
}

func (r *shareRepository) GetFileSharesForUser(ctx context.Context, userEmail string) ([]models.FileShare, error) {
	query := `SELECT fs.id, fs.file_id, fs.owner_id, fs.shared_with_email, fs.shared_with_id, 
	                 fs.permission, fs.shared_at, fs.expires_at,
	                 f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
	                 COALESCE(u.id, gu.id) as owner_id, 
	                 COALESCE(u.email, gu.email) as owner_email, 
	                 COALESCE(u.created_at, NOW()) as owner_created_at
	          FROM file_shares fs
	          JOIN files f ON fs.file_id = f.id
	          LEFT JOIN users u ON fs.owner_id = u.id
	          LEFT JOIN google_users gu ON fs.owner_id = gu.id
	          WHERE fs.shared_with_email = $1 AND (fs.expires_at IS NULL OR fs.expires_at > NOW())`

	rows, err := r.DB.Query(ctx, query, userEmail)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []models.FileShare
	for rows.Next() {
		var share models.FileShare
		var file models.File
		var owner models.User

		err := rows.Scan(
			&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithEmail, &share.SharedWithID,
			&share.Permission, &share.SharedAt, &share.ExpiresAt,
			&file.ID, &file.Hash, &file.OriginalName, &file.MimeType, &file.Size,
			&file.RefCount, &file.Visibility, &file.CreatedAt,
			&owner.ID, &owner.Email, &owner.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		share.File = file
		share.Owner = owner
		shares = append(shares, share)
	}

	return shares, nil
}

func (r *shareRepository) DeleteFileShare(ctx context.Context, fileID uuid.UUID, sharedWithEmail string) error {
	query := `DELETE FROM file_shares WHERE file_id = $1 AND shared_with_email = $2`
	_, err := r.DB.Exec(ctx, query, fileID, sharedWithEmail)
	return err
}

// Folder sharing implementation
func (r *shareRepository) CreateFolderShare(ctx context.Context, folderID, ownerID uuid.UUID, sharedWithEmail string, permission string, expiresAt *time.Time) (*models.FolderShare, error) {
	id := uuid.New()
	query := `INSERT INTO folder_shares (id, folder_id, owner_id, shared_with_email, permission, shared_at, expires_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)
	          ON CONFLICT (folder_id, shared_with_email) 
	          DO UPDATE SET permission = EXCLUDED.permission, expires_at = EXCLUDED.expires_at
	          RETURNING id`

	err := r.DB.QueryRow(ctx, query, id, folderID, ownerID, sharedWithEmail, permission, time.Now(), expiresAt).Scan(&id)
	if err != nil {
		return nil, err
	}

	// Load the complete share with related data
	return r.getFolderShareByID(ctx, id)
}

func (r *shareRepository) getFolderShareByID(ctx context.Context, shareID uuid.UUID) (*models.FolderShare, error) {
	query := `SELECT fs.id, fs.folder_id, fs.owner_id, fs.shared_with_email, fs.shared_with_id, 
	                 fs.permission, fs.shared_at, fs.expires_at,
	                 f.id, f.name, f.parent_id, f.created_at
	          FROM folder_shares fs
	          JOIN folders f ON fs.folder_id = f.id
	          WHERE fs.id = $1`

	var share models.FolderShare
	var folder models.Folder

	err := r.DB.QueryRow(ctx, query, shareID).Scan(
		&share.ID, &share.FolderID, &share.OwnerID, &share.SharedWithEmail, &share.SharedWithID,
		&share.Permission, &share.SharedAt, &share.ExpiresAt,
		&folder.ID, &folder.Name, &folder.ParentID, &folder.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	share.Folder = folder
	return &share, nil
}

func (r *shareRepository) GetFolderShares(ctx context.Context, folderID uuid.UUID) ([]models.FolderShare, error) {
	query := `SELECT fs.id, fs.folder_id, fs.owner_id, fs.shared_with_email, fs.shared_with_id, 
	                 fs.permission, fs.shared_at, fs.expires_at,
	                 f.id, f.name, f.parent_id, f.created_at
	          FROM folder_shares fs
	          JOIN folders f ON fs.folder_id = f.id
	          WHERE fs.folder_id = $1`

	rows, err := r.DB.Query(ctx, query, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []models.FolderShare
	for rows.Next() {
		var share models.FolderShare
		var folder models.Folder

		err := rows.Scan(
			&share.ID, &share.FolderID, &share.OwnerID, &share.SharedWithEmail, &share.SharedWithID,
			&share.Permission, &share.SharedAt, &share.ExpiresAt,
			&folder.ID, &folder.Name, &folder.ParentID, &folder.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		share.Folder = folder
		shares = append(shares, share)
	}

	return shares, nil
}

func (r *shareRepository) GetFolderSharesForUser(ctx context.Context, userEmail string) ([]models.FolderShare, error) {
	query := `SELECT fs.id, fs.folder_id, fs.owner_id, fs.shared_with_email, fs.shared_with_id, 
	                 fs.permission, fs.shared_at, fs.expires_at,
	                 f.id, f.name, f.parent_id, f.created_at,
	                 COALESCE(u.id, gu.id) as owner_id, 
	                 COALESCE(u.email, gu.email) as owner_email, 
	                 COALESCE(u.created_at, NOW()) as owner_created_at
	          FROM folder_shares fs
	          JOIN folders f ON fs.folder_id = f.id
	          LEFT JOIN users u ON fs.owner_id = u.id
	          LEFT JOIN google_users gu ON fs.owner_id = gu.id
	          WHERE fs.shared_with_email = $1 AND (fs.expires_at IS NULL OR fs.expires_at > NOW())`

	rows, err := r.DB.Query(ctx, query, userEmail)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []models.FolderShare
	for rows.Next() {
		var share models.FolderShare
		var folder models.Folder
		var owner models.User

		err := rows.Scan(
			&share.ID, &share.FolderID, &share.OwnerID, &share.SharedWithEmail, &share.SharedWithID,
			&share.Permission, &share.SharedAt, &share.ExpiresAt,
			&folder.ID, &folder.Name, &folder.ParentID, &folder.CreatedAt,
			&owner.ID, &owner.Email, &owner.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		share.Folder = folder
		share.Owner = owner
		shares = append(shares, share)
	}

	return shares, nil
}

func (r *shareRepository) DeleteFolderShare(ctx context.Context, folderID uuid.UUID, sharedWithEmail string) error {
	query := `DELETE FROM folder_shares WHERE folder_id = $1 AND shared_with_email = $2`
	_, err := r.DB.Exec(ctx, query, folderID, sharedWithEmail)
	return err
}

// Permission checking functions
func (r *shareRepository) HasFileAccess(ctx context.Context, userID uuid.UUID, userEmail string, fileID uuid.UUID) (bool, string, error) {
	// Check if user owns the file
	query := `SELECT role FROM user_files WHERE user_id = $1 AND file_id = $2 AND deleted_at IS NULL`
	var role string
	err := r.DB.QueryRow(ctx, query, userID, fileID).Scan(&role)
	if err == nil {
		return true, role, nil
	}

	// Check if file is shared with user
	query = `SELECT permission FROM file_shares WHERE file_id = $1 AND shared_with_email = $2 AND (expires_at IS NULL OR expires_at > NOW())`
	var permission string
	err = r.DB.QueryRow(ctx, query, fileID, userEmail).Scan(&permission)
	if err == nil {
		return true, permission, nil
	}

	return false, "", nil
}

func (r *shareRepository) HasFolderAccess(ctx context.Context, userID uuid.UUID, userEmail string, folderID uuid.UUID) (bool, string, error) {
	// Check if user owns the folder
	query := `SELECT 'owner' FROM folders WHERE user_id = $1 AND id = $2`
	var role string
	err := r.DB.QueryRow(ctx, query, userID, folderID).Scan(&role)
	if err == nil {
		return true, role, nil
	}

	// Check if folder is directly shared with user
	query = `SELECT permission FROM folder_shares WHERE folder_id = $1 AND shared_with_email = $2 AND (expires_at IS NULL OR expires_at > NOW())`
	var permission string
	err = r.DB.QueryRow(ctx, query, folderID, userEmail).Scan(&permission)
	if err == nil {
		return true, permission, nil
	}

	// Check if user has access to any parent folder (recursive check)
	hasParentAccess, parentPermission, err := r.hasParentFolderAccess(ctx, userID, userEmail, folderID)
	if err != nil {
		return false, "", err
	}
	if hasParentAccess {
		return true, parentPermission, nil
	}

	return false, "", nil
}

// hasParentFolderAccess checks if user has access to any parent folder
func (r *shareRepository) hasParentFolderAccess(ctx context.Context, userID uuid.UUID, userEmail string, folderID uuid.UUID) (bool, string, error) {
	// Get the parent folder ID
	var parentID *uuid.UUID
	query := `SELECT parent_id FROM folders WHERE id = $1`
	err := r.DB.QueryRow(ctx, query, folderID).Scan(&parentID)
	if err != nil {
		// If there's an error or no parent, no inherited access
		return false, "", nil
	}

	if parentID == nil {
		// Reached root level, no inherited access
		return false, "", nil
	}

	// Check if user owns the parent folder
	query = `SELECT 'owner' FROM folders WHERE user_id = $1 AND id = $2`
	var role string
	err = r.DB.QueryRow(ctx, query, userID, *parentID).Scan(&role)
	if err == nil {
		return true, role, nil
	}

	// Check if parent folder is shared with user
	query = `SELECT permission FROM folder_shares WHERE folder_id = $1 AND shared_with_email = $2 AND (expires_at IS NULL OR expires_at > NOW())`
	var permission string
	err = r.DB.QueryRow(ctx, query, *parentID, userEmail).Scan(&permission)
	if err == nil {
		return true, permission, nil
	}

	// Recursively check the parent's parent
	return r.hasParentFolderAccess(ctx, userID, userEmail, *parentID)
}

func (r *shareRepository) GetFolderFiles(ctx context.Context, folderID uuid.UUID) ([]models.UserFile, error) {
	// Get files in the folder - remove user_id restriction for shared access
	query := `
		SELECT 
			uf.id, uf.user_id, uf.file_id, uf.uploaded_at,
			f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
			COALESCE(u.email, gu.email) as uploader_email,
			COALESCE('', gu.name) as uploader_name,
			COALESCE('', gu.picture) as uploader_picture
		FROM user_files uf 
		JOIN files f ON uf.file_id = f.id 
		JOIN folders fo ON uf.folder_id = fo.id
		LEFT JOIN users u ON uf.user_id = u.id 
		LEFT JOIN google_users gu ON uf.user_id = gu.id 
		WHERE uf.folder_id = $1 
		  AND uf.deleted_at IS NULL
		ORDER BY uf.uploaded_at DESC`

	rows, err := r.DB.Query(ctx, query, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.UserFile
	for rows.Next() {
		var uf models.UserFile
		var uploaderEmail, uploaderName, uploaderPicture string

		err := rows.Scan(
			&uf.ID, &uf.UserID, &uf.FileID, &uf.UploadedAt,
			&uf.File.ID, &uf.File.Hash, &uf.File.OriginalName, &uf.File.MimeType,
			&uf.File.Size, &uf.File.RefCount, &uf.File.Visibility, &uf.File.CreatedAt,
			&uploaderEmail, &uploaderName, &uploaderPicture,
		)
		if err != nil {
			return nil, err
		}

		// Set uploader fields
		uf.UploaderEmail = uploaderEmail
		uf.UploaderName = uploaderName
		uf.UploaderPicture = uploaderPicture

		files = append(files, uf)
	}

	return files, rows.Err()
}

// GetDirectSubfolders returns direct subfolders of a given folder (not recursive, no user filtering)
func (r *shareRepository) GetDirectSubfolders(ctx context.Context, folderID uuid.UUID) ([]models.Folder, error) {
	rows, err := r.DB.Query(ctx, `
		SELECT id, user_id, name, parent_id, created_at 
		FROM folders 
		WHERE parent_id = $1 
		ORDER BY name ASC
	`, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var f models.Folder
		if err := rows.Scan(&f.ID, &f.UserID, &f.Name, &f.ParentID, &f.CreatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}

	return folders, rows.Err()
}
