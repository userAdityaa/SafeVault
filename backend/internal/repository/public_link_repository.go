package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type PublicLinkRepository interface {
	CreateFileLink(ctx context.Context, fileID, ownerID uuid.UUID, token string, expiresAt *time.Time) error
	GetActiveFileLinkByFile(ctx context.Context, fileID uuid.UUID) (string, *time.Time, *time.Time, error)
	GetFileLinkResolve(ctx context.Context, token string) (*models.File, *models.User, *time.Time, *time.Time, error)
	RevokeFileLink(ctx context.Context, fileID uuid.UUID) error

	CreateFolderLink(ctx context.Context, folderID, ownerID uuid.UUID, token string, expiresAt *time.Time) error
	GetActiveFolderLinkByFolder(ctx context.Context, folderID uuid.UUID) (string, *time.Time, *time.Time, error)
	GetFolderLinkResolve(ctx context.Context, token string) (*models.Folder, *models.User, *time.Time, *time.Time, error)
	RevokeFolderLink(ctx context.Context, folderID uuid.UUID) error

	IncrementFileDownload(ctx context.Context, token string) error
	IncrementFolderAccess(ctx context.Context, token string) error
}

type publicLinkRepository struct{ DB *pgxpool.Pool }

func NewPublicLinkRepository(db *pgxpool.Pool) PublicLinkRepository {
	return &publicLinkRepository{DB: db}
}

func (r *publicLinkRepository) CreateFileLink(ctx context.Context, fileID, ownerID uuid.UUID, token string, expiresAt *time.Time) error {
	_, err := r.DB.Exec(ctx, `INSERT INTO file_public_links (file_id, owner_id, token, expires_at) VALUES ($1,$2,$3,$4)`, fileID, ownerID, token, expiresAt)
	return err
}

func (r *publicLinkRepository) GetActiveFileLinkByFile(ctx context.Context, fileID uuid.UUID) (string, *time.Time, *time.Time, error) {
	var token string
	var expiresAt *time.Time
	var revokedAt *time.Time
	err := r.DB.QueryRow(ctx, `SELECT token, expires_at, revoked_at FROM file_public_links WHERE file_id=$1 ORDER BY created_at DESC LIMIT 1`, fileID).Scan(&token, &expiresAt, &revokedAt)
	if err != nil {
		return "", nil, nil, err
	}
	return token, expiresAt, revokedAt, nil
}

func (r *publicLinkRepository) GetFileLinkResolve(ctx context.Context, token string) (*models.File, *models.User, *time.Time, *time.Time, error) {
	q := `SELECT f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
                 COALESCE(u.id, gu.id) as owner_id, COALESCE(u.email, gu.email) as owner_email, COALESCE(u.created_at, NOW()) as owner_created_at,
                 l.expires_at, l.revoked_at
          FROM file_public_links l
          JOIN files f ON l.file_id = f.id
          LEFT JOIN users u ON l.owner_id = u.id
          LEFT JOIN google_users gu ON l.owner_id = gu.id
          WHERE l.token=$1`
	var file models.File
	var owner models.User
	var expiresAt *time.Time
	var revokedAt *time.Time
	err := r.DB.QueryRow(ctx, q, token).Scan(&file.ID, &file.Hash, &file.OriginalName, &file.MimeType, &file.Size, &file.RefCount, &file.Visibility, &file.CreatedAt, &owner.ID, &owner.Email, &owner.CreatedAt, &expiresAt, &revokedAt)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	return &file, &owner, expiresAt, revokedAt, nil
}

func (r *publicLinkRepository) RevokeFileLink(ctx context.Context, fileID uuid.UUID) error {
	ct, err := r.DB.Exec(ctx, `UPDATE file_public_links SET revoked_at=NOW() WHERE file_id=$1 AND revoked_at IS NULL`, fileID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("no active link")
	}
	return nil
}

func (r *publicLinkRepository) CreateFolderLink(ctx context.Context, folderID, ownerID uuid.UUID, token string, expiresAt *time.Time) error {
	_, err := r.DB.Exec(ctx, `INSERT INTO folder_public_links (folder_id, owner_id, token, expires_at) VALUES ($1,$2,$3,$4)`, folderID, ownerID, token, expiresAt)
	return err
}

func (r *publicLinkRepository) GetActiveFolderLinkByFolder(ctx context.Context, folderID uuid.UUID) (string, *time.Time, *time.Time, error) {
	var token string
	var expiresAt *time.Time
	var revokedAt *time.Time
	err := r.DB.QueryRow(ctx, `SELECT token, expires_at, revoked_at FROM folder_public_links WHERE folder_id=$1 ORDER BY created_at DESC LIMIT 1`, folderID).Scan(&token, &expiresAt, &revokedAt)
	if err != nil {
		return "", nil, nil, err
	}
	return token, expiresAt, revokedAt, nil
}

func (r *publicLinkRepository) GetFolderLinkResolve(ctx context.Context, token string) (*models.Folder, *models.User, *time.Time, *time.Time, error) {
	q := `SELECT fo.id, fo.name, fo.parent_id, fo.created_at,
                 COALESCE(u.id, gu.id) as owner_id, COALESCE(u.email, gu.email) as owner_email, COALESCE(u.created_at, NOW()) as owner_created_at,
                 l.expires_at, l.revoked_at
          FROM folder_public_links l
          JOIN folders fo ON l.folder_id = fo.id
          LEFT JOIN users u ON l.owner_id = u.id
          LEFT JOIN google_users gu ON l.owner_id = gu.id
          WHERE l.token=$1`
	var folder models.Folder
	var owner models.User
	var expiresAt *time.Time
	var revokedAt *time.Time
	err := r.DB.QueryRow(ctx, q, token).Scan(&folder.ID, &folder.Name, &folder.ParentID, &folder.CreatedAt, &owner.ID, &owner.Email, &owner.CreatedAt, &expiresAt, &revokedAt)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	return &folder, &owner, expiresAt, revokedAt, nil
}

func (r *publicLinkRepository) RevokeFolderLink(ctx context.Context, folderID uuid.UUID) error {
	ct, err := r.DB.Exec(ctx, `UPDATE folder_public_links SET revoked_at=NOW() WHERE folder_id=$1 AND revoked_at IS NULL`, folderID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("no active link")
	}
	return nil
}

func (r *publicLinkRepository) IncrementFileDownload(ctx context.Context, token string) error {
	_, err := r.DB.Exec(ctx, `UPDATE file_public_links SET download_count = download_count + 1 WHERE token=$1`, token)
	return err
}
func (r *publicLinkRepository) IncrementFolderAccess(ctx context.Context, token string) error {
	_, err := r.DB.Exec(ctx, `UPDATE folder_public_links SET access_count = access_count + 1 WHERE token=$1`, token)
	return err
}
