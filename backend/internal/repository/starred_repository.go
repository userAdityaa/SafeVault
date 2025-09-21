package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

// StarredRepository defines the interface for starred items database operations.
// It provides methods for users to star/unstar files and folders for quick access.
type StarredRepository interface {
	// StarItem adds an item (file or folder) to the user's starred list
	StarItem(ctx context.Context, userID uuid.UUID, itemType string, itemID uuid.UUID) error
	// UnstarItem removes an item from the user's starred list
	UnstarItem(ctx context.Context, userID uuid.UUID, itemType string, itemID uuid.UUID) error
	// IsItemStarred checks if a specific item is starred by the user
	IsItemStarred(ctx context.Context, userID uuid.UUID, itemType string, itemID uuid.UUID) (bool, error)

	// GetStarredFiles retrieves all starred files for a user with file details
	GetStarredFiles(ctx context.Context, userID uuid.UUID) ([]models.StarredFile, error)
	// GetStarredFolders retrieves all starred folders for a user with folder details
	GetStarredFolders(ctx context.Context, userID uuid.UUID) ([]models.StarredFolder, error)
	// GetAllStarredItems retrieves all starred items (files and folders) for a user
	GetAllStarredItems(ctx context.Context, userID uuid.UUID) ([]models.StarredItem, error)

	// GetStarredStatus returns the starred status for multiple items in a single query
	GetStarredStatus(ctx context.Context, userID uuid.UUID, items []struct {
		Type string
		ID   uuid.UUID
	}) (map[string]bool, error)
}

// starredRepository implements StarredRepository using PostgreSQL
type starredRepository struct {
	DB *pgxpool.Pool
}

// NewStarredRepository creates a new starred repository instance
func NewStarredRepository(db *pgxpool.Pool) StarredRepository {
	return &starredRepository{DB: db}
}

// StarItem adds an item (file or folder) to the user's starred list.
// Uses ON CONFLICT to prevent duplicate stars for the same item.
func (r *starredRepository) StarItem(ctx context.Context, userID uuid.UUID, itemType string, itemID uuid.UUID) error {
	query := `
		INSERT INTO starred_items (user_id, item_type, item_id) 
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, item_type, item_id) DO NOTHING`

	_, err := r.DB.Exec(ctx, query, userID, itemType, itemID)
	return err
}

// UnstarItem removes an item from the user's starred list.
func (r *starredRepository) UnstarItem(ctx context.Context, userID uuid.UUID, itemType string, itemID uuid.UUID) error {
	query := `
		DELETE FROM starred_items 
		WHERE user_id = $1 AND item_type = $2 AND item_id = $3`

	_, err := r.DB.Exec(ctx, query, userID, itemType, itemID)
	return err
}

func (r *starredRepository) IsItemStarred(ctx context.Context, userID uuid.UUID, itemType string, itemID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM starred_items 
			WHERE user_id = $1 AND item_type = $2 AND item_id = $3
		)`

	var exists bool
	err := r.DB.QueryRow(ctx, query, userID, itemType, itemID).Scan(&exists)
	return exists, err
}

func (r *starredRepository) GetStarredFiles(ctx context.Context, userID uuid.UUID) ([]models.StarredFile, error) {
	query := `
		SELECT 
			si.id, si.user_id, si.item_type, si.item_id, si.starred_at,
			f.id, f.hash, f.storage_path, f.original_name, f.mime_type, f.size, f.ref_count, f.visibility, f.created_at
		FROM starred_items si
		JOIN files f ON si.item_id = f.id
		WHERE si.user_id = $1 AND si.item_type = 'file'
		ORDER BY si.starred_at DESC`

	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var starredFiles []models.StarredFile
	for rows.Next() {
		var sf models.StarredFile
		err := rows.Scan(
			&sf.ID, &sf.UserID, &sf.ItemType, &sf.ItemID, &sf.StarredAt,
			&sf.File.ID, &sf.File.Hash, &sf.File.StoragePath, &sf.File.OriginalName,
			&sf.File.MimeType, &sf.File.Size, &sf.File.RefCount, &sf.File.Visibility, &sf.File.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		starredFiles = append(starredFiles, sf)
	}

	return starredFiles, rows.Err()
}

func (r *starredRepository) GetStarredFolders(ctx context.Context, userID uuid.UUID) ([]models.StarredFolder, error) {
	query := `
		SELECT 
			si.id, si.user_id, si.item_type, si.item_id, si.starred_at,
			fo.id, fo.name, fo.user_id, fo.parent_id, fo.created_at
		FROM starred_items si
		JOIN folders fo ON si.item_id = fo.id
		WHERE si.user_id = $1 AND si.item_type = 'folder'
		ORDER BY si.starred_at DESC`

	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var starredFolders []models.StarredFolder
	for rows.Next() {
		var sf models.StarredFolder
		err := rows.Scan(
			&sf.ID, &sf.UserID, &sf.ItemType, &sf.ItemID, &sf.StarredAt,
			&sf.Folder.ID, &sf.Folder.Name, &sf.Folder.UserID, &sf.Folder.ParentID, &sf.Folder.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		starredFolders = append(starredFolders, sf)
	}

	return starredFolders, rows.Err()
}

func (r *starredRepository) GetAllStarredItems(ctx context.Context, userID uuid.UUID) ([]models.StarredItem, error) {
	query := `
		SELECT id, user_id, item_type, item_id, starred_at
		FROM starred_items 
		WHERE user_id = $1
		ORDER BY starred_at DESC`

	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var starredItems []models.StarredItem
	for rows.Next() {
		var si models.StarredItem
		err := rows.Scan(&si.ID, &si.UserID, &si.ItemType, &si.ItemID, &si.StarredAt)
		if err != nil {
			return nil, err
		}
		starredItems = append(starredItems, si)
	}

	return starredItems, rows.Err()
}

func (r *starredRepository) GetStarredStatus(ctx context.Context, userID uuid.UUID, items []struct {
	Type string
	ID   uuid.UUID
}) (map[string]bool, error) {
	if len(items) == 0 {
		return make(map[string]bool), nil
	}

	// Build dynamic query for multiple items
	query := `SELECT item_type, item_id FROM starred_items WHERE user_id = $1 AND (`
	args := []interface{}{userID}
	argIndex := 2

	for i, item := range items {
		if i > 0 {
			query += " OR "
		}
		query += fmt.Sprintf("(item_type = $%d AND item_id = $%d)", argIndex, argIndex+1)
		args = append(args, item.Type, item.ID)
		argIndex += 2
	}
	query += ")"

	rows, err := r.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]bool)

	// Initialize all items as not starred
	for _, item := range items {
		key := fmt.Sprintf("%s:%s", item.Type, item.ID.String())
		result[key] = false
	}

	// Mark starred items as true
	for rows.Next() {
		var itemType string
		var itemID uuid.UUID
		if err := rows.Scan(&itemType, &itemID); err != nil {
			return nil, err
		}
		key := fmt.Sprintf("%s:%s", itemType, itemID.String())
		result[key] = true
	}

	return result, rows.Err()
}
