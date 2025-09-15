package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/auth"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

type GoogleService struct {
	UserRepo repository.UserRepository
}

func (s *GoogleService) LoginWithGoogle(ctx context.Context, idToken string) (*models.GoogleUser, string, error) {
	payload, err := auth.VerifyWithGoogleIDToken(idToken)
	if err != nil {
		return nil, "", err
	}

	email := payload.Claims["email"].(string)

	user, err := s.UserRepo.FindByGoogleMail(ctx, email)
	if err != nil {
		newUser := &models.GoogleUser{
			ID:    uuid.New(),
			Email: email,
		}
		if err := s.UserRepo.CreateGoogleUser(ctx, newUser); err != nil {
			return nil, "", err
		}
		user = newUser
	}

	fmt.Println("This is the user: ", user)

	token, err := auth.GenerateJWT(user.ID.String())
	if err != nil {
		return nil, "", err
	}

	fmt.Println("This is the token: ", token)

	return user, token, nil
}
