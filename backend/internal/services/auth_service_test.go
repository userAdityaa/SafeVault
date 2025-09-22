package services

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/useradityaa/internal/models"
)

// stubUserRepo is a minimal in-memory stub for UserRepository used in tests
type stubUserRepo struct {
	usersByEmail  map[string]*models.User
	googleByEmail map[string]*models.GoogleUser
}

func (s *stubUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return s.usersByEmail[email], nil
}
func (s *stubUserRepo) FindByGoogleMail(ctx context.Context, email string) (*models.GoogleUser, error) {
	return s.googleByEmail[email], nil
}
func (s *stubUserRepo) Create(ctx context.Context, user *models.User) error { return nil }
func (s *stubUserRepo) CreateGoogleUser(ctx context.Context, user *models.GoogleUser) error {
	return nil
}
func (s *stubUserRepo) UpdateGoogleUserProfile(ctx context.Context, email, name, picture string) error {
	return nil
}
func (s *stubUserRepo) FindByID(ctx context.Context, id string) (*models.User, error) {
	return nil, nil
}
func (s *stubUserRepo) FindUserByEmailAny(ctx context.Context, email string) (interface{}, string, error) {
	return nil, "", nil
}
func (s *stubUserRepo) GetUserEmailByID(ctx context.Context, userID string) (string, error) {
	return "", nil
}
func (s *stubUserRepo) GetAllUsers(ctx context.Context) ([]*models.AdminUserInfo, error) {
	return nil, nil
}

func TestAuthService_IsAdmin(t *testing.T) {
	svc := &AuthService{}
	// Admin email is loaded from env via config.Load(); set it temporarily
	t.Setenv("ADMIN_EMAIL", "admin@example.com")
	if !svc.IsAdmin("admin@example.com") {
		t.Fatalf("expected admin@example.com to be admin")
	}
	if svc.IsAdmin("user@example.com") {
		t.Fatalf("expected user@example.com to not be admin")
	}
}

func TestAuthService_LoginInvalidUser(t *testing.T) {
	s := &AuthService{UserRepo: &stubUserRepo{usersByEmail: map[string]*models.User{}, googleByEmail: map[string]*models.GoogleUser{}}}
	t.Setenv("JWT_SECRET", "testsecret")
	u, tok, err := s.Login(context.Background(), "nouser@example.com", "bad")
	if err == nil || u != nil || tok != "" {
		t.Fatalf("expected login to fail for unknown user")
	}
}

func TestUUIDGeneration(t *testing.T) {
	// Simple sanity check to ensure uuid lib available in tests
	if uuid.New() == uuid.Nil {
		t.Fatalf("uuid should not be nil")
	}
}
