package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByGoogleMail(ctx context.Context, email string) (*models.GoogleUser, error)
	Create(ctx context.Context, user *models.User) error
	CreateGoogleUser(ctx context.Context, user *models.GoogleUser) error
	UpdateGoogleUserProfile(ctx context.Context, email, name, picture string) error
	FindByID(ctx context.Context, id string) (*models.User, error)
}

type userRepository struct {
	DB *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &userRepository{DB: db}
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	query :=
		`SELECT id, email, password_hash
	FROM users 
	WHERE email=$1`
	row := r.DB.QueryRow(ctx, query, email)

	user := &models.User{}
	err := row.Scan(&user.ID, &user.Email, &user.PasswordHash)
	if err != nil {
		return nil, err
	}

	return user, nil
}

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

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	query :=
		`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`
	_, err := r.DB.Exec(ctx, query, user.ID, user.Email, user.PasswordHash)

	return err
}

func (r *userRepository) CreateGoogleUser(ctx context.Context, user *models.GoogleUser) error {
	query := `INSERT INTO google_users (email, name, picture) VALUES ($1, $2, $3) RETURNING id`
	return r.DB.QueryRow(ctx, query, user.Email, user.Name, user.Picture).Scan(&user.ID)
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	query :=
		`SELECT id, email, password_hash 
	FROM users 
	WHERE id=$1`
	row := r.DB.QueryRow(ctx, query, id)

	user := &models.User{}

	err := row.Scan(&user.ID, &user.Email, &user.PasswordHash)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *userRepository) UpdateGoogleUserProfile(ctx context.Context, email, name, picture string) error {
	_, err := r.DB.Exec(ctx, `UPDATE google_users SET name=$2, picture=$3 WHERE email=$1`, email, name, picture)
	return err
}
