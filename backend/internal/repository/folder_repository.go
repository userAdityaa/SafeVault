package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type FolderRepository interface {
	CreateFolder(ctx context.Context, userID uuid.UUID, name string, parentID *uuid.UUID) (*models.Folder, error)
	RenameFolder(ctx context.Context, userID, folderID uuid.UUID, newName string) error
	DeleteFolder(ctx context.Context, userID, folderID uuid.UUID) error
	ListFolders(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID) ([]models.Folder, error)
	GetFolderByID(ctx context.Context, userID, folderID uuid.UUID) (*models.Folder, error)
	CountChildren(ctx context.Context, userID, folderID uuid.UUID) (int, error)
	ValidateParent(ctx context.Context, userID uuid.UUID, parentID uuid.UUID) (bool, error)
	DeleteFolderReassignFiles(ctx context.Context, userID, folderID uuid.UUID) error
}

type folderRepository struct{ DB *pgxpool.Pool }

func NewFolderRepository(db *pgxpool.Pool) FolderRepository { return &folderRepository{DB: db} }

func (r *folderRepository) CreateFolder(ctx context.Context, userID uuid.UUID, name string, parentID *uuid.UUID) (*models.Folder, error) {
	id := uuid.New()
	_, err := r.DB.Exec(ctx, `INSERT INTO folders (id, user_id, name, parent_id, created_at) VALUES ($1,$2,$3,$4,$5)`, id, userID, name, parentID, time.Now())
	if err != nil {
		return nil, err
	}
	return &models.Folder{ID: id, UserID: userID, Name: name, ParentID: parentID, CreatedAt: time.Now()}, nil
}

func (r *folderRepository) RenameFolder(ctx context.Context, userID, folderID uuid.UUID, newName string) error {
	_, err := r.DB.Exec(ctx, `UPDATE folders SET name=$3 WHERE id=$1 AND user_id=$2`, folderID, userID, newName)
	return err
}

func (r *folderRepository) DeleteFolder(ctx context.Context, userID, folderID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `DELETE FROM folders WHERE id=$1 AND user_id=$2`, folderID, userID)
	return err
}

func (r *folderRepository) ValidateParent(ctx context.Context, userID uuid.UUID, parentID uuid.UUID) (bool, error) {
	row := r.DB.QueryRow(ctx, `SELECT 1 FROM folders WHERE id=$1 AND user_id=$2`, parentID, userID)
	var one int
	if err := row.Scan(&one); err != nil {
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// DeleteFolderReassignFiles moves files in the folder to root (folder_id=NULL) then deletes the folder.
func (r *folderRepository) DeleteFolderReassignFiles(ctx context.Context, userID, folderID uuid.UUID) error {
	batch := &pgx.Batch{}
	batch.Queue(`UPDATE user_files SET folder_id=NULL WHERE folder_id=$1 AND user_id=$2`, folderID, userID)
	batch.Queue(`DELETE FROM folders WHERE id=$1 AND user_id=$2`, folderID, userID)
	br := r.DB.SendBatch(ctx, batch)
	if _, err := br.Exec(); err != nil {
		br.Close()
		return err
	}
	if _, err := br.Exec(); err != nil {
		br.Close()
		return err
	}
	return br.Close()
}

func (r *folderRepository) ListFolders(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID) ([]models.Folder, error) {
	var rows pgx.Rows
	var err error
	if parentID == nil {
		rows, err = r.DB.Query(ctx, `SELECT id, user_id, name, parent_id, created_at FROM folders WHERE user_id=$1 AND parent_id IS NULL ORDER BY name ASC`, userID)
	} else {
		rows, err = r.DB.Query(ctx, `SELECT id, user_id, name, parent_id, created_at FROM folders WHERE user_id=$1 AND parent_id=$2 ORDER BY name ASC`, userID, *parentID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Folder
	for rows.Next() {
		var f models.Folder
		if err := rows.Scan(&f.ID, &f.UserID, &f.Name, &f.ParentID, &f.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, nil
}

func (r *folderRepository) GetFolderByID(ctx context.Context, userID, folderID uuid.UUID) (*models.Folder, error) {
	row := r.DB.QueryRow(ctx, `SELECT id, user_id, name, parent_id, created_at FROM folders WHERE id=$1 AND user_id=$2`, folderID, userID)
	var f models.Folder
	if err := row.Scan(&f.ID, &f.UserID, &f.Name, &f.ParentID, &f.CreatedAt); err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *folderRepository) CountChildren(ctx context.Context, userID, folderID uuid.UUID) (int, error) {
	row := r.DB.QueryRow(ctx, `SELECT COUNT(1) FROM folders WHERE parent_id=$1 AND user_id=$2`, folderID, userID)
	var n int
	if err := row.Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}
