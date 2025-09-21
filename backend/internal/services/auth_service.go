package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/auth"
	"github.com/useradityaa/internal/config"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

// AuthService handles user authentication operations including signup, login, and admin checks.
// It manages both email/password authentication and provides admin privilege validation.
type AuthService struct {
	// UserRepo provides database operations for user management
	UserRepo repository.UserRepository
}

// Signup creates a new user account with email and password authentication.
// It validates that the email is not already in use, hashes the password securely,
// and generates a JWT token for immediate authentication.
//
// Parameters:
//   - ctx: Request context for database operations
//   - email: User's email address (must be unique)
//   - password: Plain text password (will be hashed)
//
// Returns:
//   - *models.User: The created user object
//   - string: JWT token for authentication
//   - error: nil on success, or an error if signup fails
func (s *AuthService) Signup(ctx context.Context, email, password string) (*models.User, string, error) {
	existingUser, _ := s.UserRepo.FindByEmail(ctx, email)
	if existingUser != nil {
		return nil, "", errors.New("user already exists")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, "", err
	}

	user := &models.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
	}
	if err := s.UserRepo.Create(ctx, user); err != nil {
		return nil, "", err
	}

	isAdmin := s.IsAdmin(user.Email)
	token, err := auth.GenerateJWT(user.ID.String(), isAdmin)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

// Login authenticates a user with email and password credentials.
// It validates the credentials against the database and generates a JWT token on success.
//
// Parameters:
//   - ctx: Request context for database operations
//   - email: User's email address
//   - password: Plain text password to verify
//
// Returns:
//   - *models.User: The authenticated user object
//   - string: JWT token for authentication
//   - error: nil on success, or an error if login fails
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, error) {
	user, err := s.UserRepo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		return nil, "", errors.New("Invalid email or password")
	}

	err = auth.CheckPasswordHash(password, user.PasswordHash)
	if err != nil {
		return nil, "", errors.New("Invalid email or password")
	}

	isAdmin := s.IsAdmin(user.Email)
	token, err := auth.GenerateJWT(user.ID.String(), isAdmin)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

// IsAdmin checks if the given email address has administrative privileges.
// Admin status is determined by comparing the email to the configured admin email.
//
// Parameters:
//   - email: The email address to check for admin privileges
//
// Returns:
//   - bool: true if the email matches the configured admin email, false otherwise
func (s *AuthService) IsAdmin(email string) bool {
	cfg := config.Load()
	return cfg.AdminEmail != "" && cfg.AdminEmail == email
}
