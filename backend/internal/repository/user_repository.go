// Package repository provides data access layer interfaces and implementations
// for the SnapVault application. It contains all database operations for users,
// files, folders, shares, and other entities using PostgreSQL.
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

// UserRepository defines the interface for user-related database operations.
// It handles both manual users (email/password) and Google OAuth users,
// providing methods for authentication, user management, and admin functionality.
type UserRepository interface {
	// FindByEmail retrieves a manual user by their email address
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	// FindByGoogleMail retrieves a Google OAuth user by their email address
	FindByGoogleMail(ctx context.Context, email string) (*models.GoogleUser, error)
	// Create adds a new manual user to the database
	Create(ctx context.Context, user *models.User) error
	// CreateGoogleUser adds a new Google OAuth user to the database
	CreateGoogleUser(ctx context.Context, user *models.GoogleUser) error
	// UpdateGoogleUserProfile updates profile information for a Google user
	UpdateGoogleUserProfile(ctx context.Context, email, name, picture string) error
	// FindByID retrieves a user by their UUID
	FindByID(ctx context.Context, id string) (*models.User, error)

	// FindUserByEmailAny searches for a user in both manual and Google user tables
	// Returns the user object, user type ("manual" or "google"), and any error
	FindUserByEmailAny(ctx context.Context, email string) (interface{}, string, error)
	// GetUserEmailByID retrieves the email address for a given user ID
	GetUserEmailByID(ctx context.Context, userID string) (string, error)

	// GetAllUsers retrieves comprehensive user information for admin dashboard
	GetAllUsers(ctx context.Context) ([]*models.AdminUserInfo, error)
}

// userRepository implements UserRepository using PostgreSQL
type userRepository struct {
	DB *pgxpool.Pool
}

// NewUserRepository creates a new user repository instance
func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &userRepository{DB: db}
}

// FindByEmail retrieves a manual user by their email address.
// This is used for email/password authentication.
func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	query :=
		`SELECT id, email, password_hash, created_at
	FROM users 
	WHERE email=$1`
	row := r.DB.QueryRow(ctx, query, email)

	user := &models.User{}
	err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// FindByGoogleMail retrieves a Google OAuth user by their email address.
// This is used for Google OAuth authentication flow.
func (r *userRepository) FindByGoogleMail(ctx context.Context, email string) (*models.GoogleUser, error) {
	query :=
		`SELECT id, email, COALESCE(name,''), COALESCE(picture,'')
	FROM google_users 
	WHERE email=$1`
	row := r.DB.QueryRow(ctx, query, email)

	user := &models.GoogleUser{}
	err := row.Scan(&user.ID, &user.Email, &user.Name, &user.Picture)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Create adds a new manual user to the database.
// The user's password should already be hashed before calling this method.
func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	query :=
		`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`
	_, err := r.DB.Exec(ctx, query, user.ID, user.Email, user.PasswordHash)

	return err
}

// CreateGoogleUser adds a new Google OAuth user to the database.
// The user ID is auto-generated and returned in the user object.
func (r *userRepository) CreateGoogleUser(ctx context.Context, user *models.GoogleUser) error {
	query := `INSERT INTO google_users (email, name, picture) VALUES ($1, $2, $3) RETURNING id`
	return r.DB.QueryRow(ctx, query, user.Email, user.Name, user.Picture).Scan(&user.ID)
}

// FindByID retrieves a manual user by their UUID.
// This is used when we have a user ID from authentication context.
func (r *userRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	query :=
		`SELECT id, email, password_hash, created_at
	FROM users 
	WHERE id=$1`
	row := r.DB.QueryRow(ctx, query, id)

	user := &models.User{}

	err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// UpdateGoogleUserProfile updates the name and picture for a Google user.
// This is typically called when the user's Google profile information changes.
func (r *userRepository) UpdateGoogleUserProfile(ctx context.Context, email, name, picture string) error {
	_, err := r.DB.Exec(ctx, `UPDATE google_users SET name=$2, picture=$3 WHERE email=$1`, email, name, picture)
	return err
}

// FindUserByEmailAny searches for a user by email in both manual and Google user tables.
// This is useful for sharing features where we need to find any type of user by email.
// Returns the user object, user type ("user" or "google"), and any error.
func (r *userRepository) FindUserByEmailAny(ctx context.Context, email string) (interface{}, string, error) {
	// Try regular users first
	user, err := r.FindByEmail(ctx, email)
	if err == nil {
		return user, "user", nil
	}

	// Try Google users
	googleUser, err := r.FindByGoogleMail(ctx, email)
	if err == nil {
		return googleUser, "google_user", nil
	}

	return nil, "", err
}

// GetUserEmailByID gets email for any user ID from both tables
func (r *userRepository) GetUserEmailByID(ctx context.Context, userID string) (string, error) {
	// Try regular users first
	query := `SELECT email FROM users WHERE id = $1`
	var email string
	err := r.DB.QueryRow(ctx, query, userID).Scan(&email)
	if err == nil {
		return email, nil
	}

	// Try Google users
	query = `SELECT email FROM google_users WHERE id = $1`
	err = r.DB.QueryRow(ctx, query, userID).Scan(&email)
	return email, err
}

// GetAllUsers returns admin information for all users
func (r *userRepository) GetAllUsers(ctx context.Context) ([]*models.AdminUserInfo, error) {
	query := `
		WITH user_stats AS (
			SELECT 
				u.id,
				u.email,
				'' as name,
				'' as picture,
				u.created_at,
				u.created_at as updated_at,
				COALESCE(COUNT(DISTINCT uf.id), 0) as total_files,
				COALESCE(COUNT(DISTINCT f.id), 0) as total_folders,
				COALESCE(SUM(file.size), 0) as storage_used
			FROM users u
			LEFT JOIN user_files uf ON u.id = uf.user_id AND uf.deleted_at IS NULL
			LEFT JOIN files file ON uf.file_id = file.id
			LEFT JOIN folders f ON u.id = f.user_id
			GROUP BY u.id, u.email, u.created_at
		UNION ALL
			SELECT 
				gu.id,
				gu.email,
				COALESCE(gu.name, '') as name,
				COALESCE(gu.picture, '') as picture,
				COALESCE(gu.created_at, NOW()) as created_at,
				COALESCE(gu.updated_at, NOW()) as updated_at,
				COALESCE(COUNT(DISTINCT uf.id), 0) as total_files,
				COALESCE(COUNT(DISTINCT f.id), 0) as total_folders,
				COALESCE(SUM(file.size), 0) as storage_used
			FROM google_users gu
			LEFT JOIN user_files uf ON gu.id = uf.user_id AND uf.deleted_at IS NULL
			LEFT JOIN files file ON uf.file_id = file.id
			LEFT JOIN folders f ON gu.id = f.user_id
			GROUP BY gu.id, gu.email, gu.name, gu.picture, gu.created_at, gu.updated_at
		)
		SELECT id, email, name, picture, created_at, updated_at, total_files, total_folders, storage_used
		FROM user_stats
		ORDER BY created_at DESC
	`

	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.AdminUserInfo
	for rows.Next() {
		user := &models.AdminUserInfo{}
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.Picture,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.TotalFiles,
			&user.TotalFolders,
			&user.StorageUsed,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, rows.Err()
}
