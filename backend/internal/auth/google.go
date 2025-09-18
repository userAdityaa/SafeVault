package auth

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/api/idtoken"
)

func VerifyWithGoogleIDToken(idToken string) (*idtoken.Payload, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")

	payload, err := idtoken.Validate(context.Background(), idToken, clientID)

	if err != nil {
		return nil, fmt.Errorf("invalid GoogleID token: %w", err)
	}

	return payload, nil
}
