package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type FileDownloadRepository interface {
	RecordDownload(ctx context.Context, fileID, ownerID uuid.UUID, downloadedBy *uuid.UUID, downloadType, shareToken, ipAddress, userAgent string) error
	GetFileDownloads(ctx context.Context, fileID uuid.UUID) ([]models.FileDownload, error)
	GetOwnerSharedFileDownloads(ctx context.Context, ownerID uuid.UUID) ([]models.FileDownload, error)
	GetFileDownloadStats(ctx context.Context) ([]models.FileDownloadStats, error)
	GetFileDownloadStatsForUser(ctx context.Context, ownerID uuid.UUID) ([]models.FileDownloadStats, error)
}

type fileDownloadRepository struct {
	DB *pgxpool.Pool
}

func NewFileDownloadRepository(db *pgxpool.Pool) FileDownloadRepository {
	return &fileDownloadRepository{DB: db}
}

func (r *fileDownloadRepository) RecordDownload(ctx context.Context, fileID, ownerID uuid.UUID, downloadedBy *uuid.UUID, downloadType, shareToken, ipAddress, userAgent string) error {
	query := `
		INSERT INTO file_downloads (file_id, downloaded_by, owner_id, download_type, share_token, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.DB.Exec(ctx, query, fileID, downloadedBy, ownerID, downloadType, shareToken, ipAddress, userAgent)
	return err
}

func (r *fileDownloadRepository) GetFileDownloads(ctx context.Context, fileID uuid.UUID) ([]models.FileDownload, error) {
	query := `
		SELECT 
			fd.id, fd.file_id, fd.downloaded_by, fd.owner_id, fd.download_type, 
			fd.share_token, fd.ip_address, fd.user_agent, fd.downloaded_at,
			f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
			COALESCE(u_downloaded.id, gu_downloaded.id) as downloaded_user_id,
			COALESCE(u_downloaded.email, gu_downloaded.email) as downloaded_user_email,
			COALESCE(u_downloaded.created_at, gu_downloaded.created_at) as downloaded_user_created_at,
			COALESCE(u_owner.id, gu_owner.id) as owner_user_id,
			COALESCE(u_owner.email, gu_owner.email) as owner_user_email,
			COALESCE(u_owner.created_at, gu_owner.created_at) as owner_user_created_at
		FROM file_downloads fd
		JOIN files f ON fd.file_id = f.id
		LEFT JOIN users u_downloaded ON fd.downloaded_by = u_downloaded.id
		LEFT JOIN google_users gu_downloaded ON fd.downloaded_by = gu_downloaded.id
		LEFT JOIN users u_owner ON fd.owner_id = u_owner.id
		LEFT JOIN google_users gu_owner ON fd.owner_id = gu_owner.id
		WHERE fd.file_id = $1
		ORDER BY fd.downloaded_at DESC
	`

	rows, err := r.DB.Query(ctx, query, fileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var downloads []models.FileDownload
	for rows.Next() {
		var download models.FileDownload
		var downloadedUser *models.User
		var tempDownloadedUser models.User
		var downloadedUserID, downloadedUserEmail, ownerUserID, ownerUserEmail *string
		var downloadedUserCreatedAt, ownerUserCreatedAt *time.Time

		err := rows.Scan(
			&download.ID, &download.FileID, &download.DownloadedBy, &download.OwnerID, &download.DownloadType,
			&download.ShareToken, &download.IPAddress, &download.UserAgent, &download.DownloadedAt,
			&download.File.ID, &download.File.Hash, &download.File.OriginalName, &download.File.MimeType,
			&download.File.Size, &download.File.RefCount, &download.File.Visibility, &download.File.CreatedAt,
			&downloadedUserID, &downloadedUserEmail, &downloadedUserCreatedAt,
			&ownerUserID, &ownerUserEmail, &ownerUserCreatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Handle downloaded user
		if downloadedUserID != nil && downloadedUserEmail != nil && downloadedUserCreatedAt != nil {
			uuid, _ := uuid.Parse(*downloadedUserID)
			tempDownloadedUser = models.User{
				ID:        uuid,
				Email:     *downloadedUserEmail,
				CreatedAt: *downloadedUserCreatedAt,
			}
			downloadedUser = &tempDownloadedUser
		}
		download.DownloadedUser = downloadedUser

		// Handle owner
		if ownerUserID != nil && ownerUserEmail != nil && ownerUserCreatedAt != nil {
			ownerUUID, _ := uuid.Parse(*ownerUserID)
			download.Owner = models.User{
				ID:        ownerUUID,
				Email:     *ownerUserEmail,
				CreatedAt: *ownerUserCreatedAt,
			}
		}

		downloads = append(downloads, download)
	}

	return downloads, rows.Err()
}

func (r *fileDownloadRepository) GetOwnerSharedFileDownloads(ctx context.Context, ownerID uuid.UUID) ([]models.FileDownload, error) {
	fmt.Printf("DEBUG: Repository querying downloads for owner: %s\n", ownerID)
	query := `
		SELECT 
			fd.id, fd.file_id, fd.downloaded_by, fd.owner_id, fd.download_type, 
			fd.share_token, fd.ip_address, fd.user_agent, fd.downloaded_at,
			f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
			COALESCE(u_downloaded.id, gu_downloaded.id) as downloaded_user_id,
			COALESCE(u_downloaded.email, gu_downloaded.email) as downloaded_user_email,
			COALESCE(u_downloaded.created_at, gu_downloaded.created_at) as downloaded_user_created_at,
			COALESCE(u_owner.id, gu_owner.id) as owner_user_id,
			COALESCE(u_owner.email, gu_owner.email) as owner_user_email,
			COALESCE(u_owner.created_at, gu_owner.created_at) as owner_user_created_at
		FROM file_downloads fd
		JOIN files f ON fd.file_id = f.id
		LEFT JOIN users u_downloaded ON fd.downloaded_by = u_downloaded.id
		LEFT JOIN google_users gu_downloaded ON fd.downloaded_by = gu_downloaded.id
		LEFT JOIN users u_owner ON fd.owner_id = u_owner.id
		LEFT JOIN google_users gu_owner ON fd.owner_id = gu_owner.id
		WHERE fd.owner_id = $1
		ORDER BY fd.downloaded_at DESC
	`

	rows, err := r.DB.Query(ctx, query, ownerID)
	if err != nil {
		fmt.Printf("ERROR: Repository query failed: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var downloads []models.FileDownload
	for rows.Next() {
		var download models.FileDownload
		var downloadedUser *models.User
		var downloadedUserID, downloadedUserEmail, downloadedUserCreatedAt interface{}
		var ownerUserID, ownerUserEmail, ownerUserCreatedAt interface{}

		err := rows.Scan(
			&download.ID, &download.FileID, &download.DownloadedBy, &download.OwnerID, &download.DownloadType,
			&download.ShareToken, &download.IPAddress, &download.UserAgent, &download.DownloadedAt,
			&download.File.ID, &download.File.Hash, &download.File.OriginalName, &download.File.MimeType,
			&download.File.Size, &download.File.RefCount, &download.File.Visibility, &download.File.CreatedAt,
			&downloadedUserID, &downloadedUserEmail, &downloadedUserCreatedAt,
			&ownerUserID, &ownerUserEmail, &ownerUserCreatedAt,
		)
		if err != nil {
			fmt.Printf("ERROR: Row scan failed: %v\n", err)
			return nil, err
		}

		// Handle downloaded user (might be null for anonymous downloads)
		if download.DownloadedBy != nil && downloadedUserID != nil {
			downloadedUser = &models.User{
				ID:        *download.DownloadedBy,
				Email:     downloadedUserEmail.(string),
				CreatedAt: downloadedUserCreatedAt.(time.Time),
			}
		}
		download.DownloadedUser = downloadedUser

		// Handle owner user (should always exist)
		if ownerUserID != nil {
			download.Owner = models.User{
				ID:        download.OwnerID,
				Email:     ownerUserEmail.(string),
				CreatedAt: ownerUserCreatedAt.(time.Time),
			}
		}

		downloads = append(downloads, download)
	}

	fmt.Printf("DEBUG: Repository found %d downloads for owner %s\n", len(downloads), ownerID)
	return downloads, rows.Err()
}

func (r *fileDownloadRepository) GetFileDownloadStats(ctx context.Context) ([]models.FileDownloadStats, error) {
	query := `
		SELECT 
			fd.file_id, fd.owner_id,
			COUNT(*) as total_downloads,
			COUNT(CASE WHEN fd.download_type = 'shared' THEN 1 END) as shared_downloads,
			COUNT(CASE WHEN fd.download_type = 'public' THEN 1 END) as public_downloads,
			MAX(fd.downloaded_at) as last_download_at,
			f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
			COALESCE(u.id, gu.id) as owner_user_id,
			COALESCE(u.email, gu.email) as owner_user_email,
			COALESCE(u.created_at, gu.created_at) as owner_user_created_at
		FROM file_downloads fd
		JOIN files f ON fd.file_id = f.id
		LEFT JOIN users u ON fd.owner_id = u.id
		LEFT JOIN google_users gu ON fd.owner_id = gu.id
		GROUP BY fd.file_id, fd.owner_id, f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
				 owner_user_id, owner_user_email, owner_user_created_at
		ORDER BY total_downloads DESC, last_download_at DESC
	`

	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []models.FileDownloadStats
	for rows.Next() {
		var stat models.FileDownloadStats
		var lastDownloadAt *time.Time
		var ownerUserID, ownerUserEmail *string
		var ownerUserCreatedAt *time.Time

		err := rows.Scan(
			&stat.FileID, &stat.OwnerID, &stat.TotalDownloads, &stat.SharedDownloads, &stat.PublicDownloads, &lastDownloadAt,
			&stat.File.ID, &stat.File.Hash, &stat.File.OriginalName, &stat.File.MimeType,
			&stat.File.Size, &stat.File.RefCount, &stat.File.Visibility, &stat.File.CreatedAt,
			&ownerUserID, &ownerUserEmail, &ownerUserCreatedAt,
		)
		if err != nil {
			return nil, err
		}

		stat.LastDownloadAt = lastDownloadAt

		// Handle owner user
		if ownerUserID != nil && ownerUserEmail != nil && ownerUserCreatedAt != nil {
			ownerUUID, _ := uuid.Parse(*ownerUserID)
			stat.Owner = models.User{
				ID:        ownerUUID,
				Email:     *ownerUserEmail,
				CreatedAt: *ownerUserCreatedAt,
			}
		}

		stats = append(stats, stat)
	}

	return stats, rows.Err()
}

func (r *fileDownloadRepository) GetFileDownloadStatsForUser(ctx context.Context, ownerID uuid.UUID) ([]models.FileDownloadStats, error) {
	query := `
		SELECT 
			fd.file_id, fd.owner_id,
			COUNT(*) as total_downloads,
			COUNT(CASE WHEN fd.download_type = 'shared' THEN 1 END) as shared_downloads,
			COUNT(CASE WHEN fd.download_type = 'public' THEN 1 END) as public_downloads,
			MAX(fd.downloaded_at) as last_download_at,
			f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
			COALESCE(u.id, gu.id) as owner_user_id,
			COALESCE(u.email, gu.email) as owner_user_email,
			COALESCE(u.created_at, gu.created_at) as owner_user_created_at
		FROM file_downloads fd
		JOIN files f ON fd.file_id = f.id
		LEFT JOIN users u ON fd.owner_id = u.id
		LEFT JOIN google_users gu ON fd.owner_id = gu.id
		WHERE fd.owner_id = $1
		GROUP BY fd.file_id, fd.owner_id, f.id, f.hash, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at,
				 owner_user_id, owner_user_email, owner_user_created_at
		ORDER BY total_downloads DESC, last_download_at DESC
	`

	rows, err := r.DB.Query(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []models.FileDownloadStats
	for rows.Next() {
		var stat models.FileDownloadStats
		var lastDownloadAt *time.Time
		var ownerUserID, ownerUserEmail *string
		var ownerUserCreatedAt *time.Time

		err := rows.Scan(
			&stat.FileID, &stat.OwnerID, &stat.TotalDownloads, &stat.SharedDownloads, &stat.PublicDownloads, &lastDownloadAt,
			&stat.File.ID, &stat.File.Hash, &stat.File.OriginalName, &stat.File.MimeType,
			&stat.File.Size, &stat.File.RefCount, &stat.File.Visibility, &stat.File.CreatedAt,
			&ownerUserID, &ownerUserEmail, &ownerUserCreatedAt,
		)
		if err != nil {
			return nil, err
		}

		stat.LastDownloadAt = lastDownloadAt

		// Handle owner user
		if ownerUserID != nil && ownerUserEmail != nil && ownerUserCreatedAt != nil {
			ownerUUID, _ := uuid.Parse(*ownerUserID)
			stat.Owner = models.User{
				ID:        ownerUUID,
				Email:     *ownerUserEmail,
				CreatedAt: *ownerUserCreatedAt,
			}
		}

		stats = append(stats, stat)
	}

	return stats, rows.Err()
}
