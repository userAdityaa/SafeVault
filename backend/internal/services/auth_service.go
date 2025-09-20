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

type AuthService struct {
	UserRepo repository.UserRepository
}

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

func (s *AuthService) IsAdmin(email string) bool {
	cfg := config.Load()
	return cfg.AdminEmail != "" && cfg.AdminEmail == email
}
