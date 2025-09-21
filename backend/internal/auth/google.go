package auth

import (
	"context"
	"fmt"

	"github.com/useradityaa/internal/config"
	"google.golang.org/api/idtoken"
)

// VerifyWithGoogleIDToken validates a Google OAuth ID token and extracts user information.
// This function verifies the token signature against Google's public keys and ensures
// it was issued for the correct client ID.
//
// Parameters:
//   - idToken: The Google OAuth ID token to validate
//
// Returns:
//   - *idtoken.Payload: The validated token payload containing user information
//   - error: nil if token is valid, or an error describing validation failure
func VerifyWithGoogleIDToken(idToken string) (*idtoken.Payload, error) {
	cfg := config.Load()
	clientID := cfg.GoogleClientID

	payload, err := idtoken.Validate(context.Background(), idToken, clientID)

	if err != nil {
		return nil, fmt.Errorf("invalid GoogleID token: %w", err)
	}

	return payload, nil
}
