package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/auth"
	"github.com/useradityaa/internal/config"
	"github.com/useradityaa/internal/models"
	"github.com/useradityaa/internal/repository"
)

// GoogleService handles Google OAuth authentication and user management.
// It processes Google ID tokens, manages Google user accounts, and generates JWT tokens.
type GoogleService struct {
	// UserRepo provides database operations for user management
	UserRepo repository.UserRepository
}

// LoginWithGoogle authenticates a user using a Google OAuth ID token.
// It validates the token with Google, creates or updates the user account,
// and generates a JWT token for the application.
//
// Parameters:
//   - ctx: Request context for database operations
//   - idToken: Google OAuth ID token to validate
//
// Returns:
//   - *models.GoogleUser: The authenticated Google user object
//   - string: JWT token for application authentication
//   - error: nil on success, or an error if authentication fails
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
			ID:      uuid.New(),
			Email:   email,
			Name:    name,
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

	cfg := config.Load()
	isAdmin := cfg.AdminEmail != "" && cfg.AdminEmail == email
	token, err := auth.GenerateJWT(user.ID.String(), isAdmin)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}
