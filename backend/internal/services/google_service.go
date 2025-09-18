package services

import (
	"context"

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

	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	user, err := s.UserRepo.FindByGoogleMail(ctx, email)
	if err != nil {
		newUser := &models.GoogleUser{
			ID:    uuid.New(),
			Email: email,
			Name: name,
			Picture: picture,
		}
		if err := s.UserRepo.CreateGoogleUser(ctx, newUser); err != nil {
			return nil, "", err
		}
		user = newUser
	} else {
		// Update profile if changed or empty
		if user.Name != name || user.Picture != picture {
			_ = s.UserRepo.UpdateGoogleUserProfile(ctx, email, name, picture)
			user.Name = name
			user.Picture = picture
		}
	}

	token, err := auth.GenerateJWT(user.ID.String())
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}
