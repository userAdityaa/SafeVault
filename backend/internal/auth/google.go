package auth

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"google.golang.org/api/idtoken"
)

func VerifyWithGoogleIDToken(idToken string) (*idtoken.Payload, error) {
	err := godotenv.Load()
	if err != nil {
		return nil, fmt.Errorf("Google clientid is not set %w", err)
	}
	clientID := os.Getenv("GOOGLE_CLIENT_ID")

	payload, err := idtoken.Validate(context.Background(), idToken, clientID)

	if err != nil {
		return nil, fmt.Errorf("invalid GoogleID token: %w", err)
	}

	return payload, nil
}
