package services

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type FileDownloadService struct {
	DownloadRepo repository.FileDownloadRepository
	FileRepo     repository.FileRepository
	ShareRepo    repository.ShareRepository
}

func NewFileDownloadService(downloadRepo repository.FileDownloadRepository, fileRepo repository.FileRepository, shareRepo repository.ShareRepository) *FileDownloadService {
	return &FileDownloadService{
		DownloadRepo: downloadRepo,
		FileRepo:     fileRepo,
		ShareRepo:    shareRepo,
	}
}

// RecordSharedFileDownload records when a user downloads a file they have access to through sharing
func (s *FileDownloadService) RecordSharedFileDownload(ctx context.Context, fileID, ownerID, downloadedBy uuid.UUID, req *http.Request) error {
	ipAddress := getClientIP(req)
	userAgent := req.UserAgent()

	return s.DownloadRepo.RecordDownload(ctx, fileID, ownerID, &downloadedBy, "shared", "", ipAddress, userAgent)
}

// RecordPublicFileDownload records when someone downloads a file through a public link
func (s *FileDownloadService) RecordPublicFileDownload(ctx context.Context, fileID, ownerID uuid.UUID, downloadedBy *uuid.UUID, shareToken string, req *http.Request) error {
	ipAddress := getClientIP(req)
	userAgent := req.UserAgent()

	return s.DownloadRepo.RecordDownload(ctx, fileID, ownerID, downloadedBy, "public", shareToken, ipAddress, userAgent)
}

// GetFileDownloads returns download history for a specific file (owner only)
func (s *FileDownloadService) GetFileDownloads(ctx context.Context, userID, fileID uuid.UUID) ([]models.FileDownload, error) {
	// Verify ownership
	uf, err := s.FileRepo.GetUserFileByFileID(ctx, userID, fileID)
	if err != nil {
		return nil, fmt.Errorf("file not found or access denied: %w", err)
	}
	if uf == nil {
		return nil, fmt.Errorf("file not found")
	}

	return s.DownloadRepo.GetFileDownloads(ctx, fileID)
}

// GetMySharedFileDownloads returns all downloads for files owned by the user
func (s *FileDownloadService) GetMySharedFileDownloads(ctx context.Context, ownerID uuid.UUID) ([]models.FileDownload, error) {
	return s.DownloadRepo.GetOwnerSharedFileDownloads(ctx, ownerID)
}

// GetAllFileDownloadStats returns download statistics for all files (admin only)
func (s *FileDownloadService) GetAllFileDownloadStats(ctx context.Context) ([]models.FileDownloadStats, error) {
	return s.DownloadRepo.GetFileDownloadStats(ctx)
}

// Helper function to extract client IP from request
func getClientIP(req *http.Request) string {
	// Check X-Forwarded-For header first (for proxies/load balancers)
	xForwardedFor := req.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(xForwardedFor, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	xRealIP := req.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	// Fall back to remote address
	ip := req.RemoteAddr
	// Remove port if present
	if colonIndex := strings.LastIndex(ip, ":"); colonIndex != -1 {
		ip = ip[:colonIndex]
	}

	return ip
}
