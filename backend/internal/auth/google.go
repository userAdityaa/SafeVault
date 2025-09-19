package auth

import (
	"context"
	"fmt"

	"github.com/useradityaa/internal/config"
	"google.golang.org/api/idtoken"
)

func VerifyWithGoogleIDToken(idToken string) (*idtoken.Payload, error) {
	cfg := config.Load()
	clientID := cfg.GoogleClientID

	payload, err := idtoken.Validate(context.Background(), idToken, clientID)

	if err != nil {
		return nil, fmt.Errorf("invalid GoogleID token: %w", err)
	}

	return payload, nil
}
