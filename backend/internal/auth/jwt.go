// Package auth provides authentication and authorization utilities for the SnapVault application.
// It includes JWT token generation and verification, password hashing/verification,
// and Google OAuth integration for secure user authentication.
package auth

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// jwtSecret is the secret key used for signing JWT tokens.
// It reads from JWT_SECRET environment variable. This variable must be set.
var jwtSecret = getJWTSecret()

// getJWTSecret retrieves the JWT secret from environment variables.
// JWT_SECRET environment variable must be set to a secure random string.
// The application will panic if this environment variable is not provided.
func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable must be set")
	}
	return []byte(secret)
}

// GenerateJWT creates a new JWT token for a user with specified admin privileges.
// The token includes the user ID, admin status, and expires in 72 hours.
//
// Parameters:
//   - userID: Unique identifier for the user
//   - isAdmin: Whether the user has administrative privileges
//
// Returns:
//   - string: The signed JWT token
//   - error: nil on success, or an error if token generation fails
func GenerateJWT(userID string, isAdmin bool) (string, error) {
	claims := jwt.MapClaims{
		"userId":  userID,
		"isAdmin": isAdmin,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// VerifyJWT validates a JWT token and extracts user information from it.
// It checks the token signature, expiration time, and required claims.
//
// Parameters:
//   - tokenString: The JWT token string to validate
//
// Returns:
//   - string: The user ID extracted from the token
//   - bool: Whether the user has admin privileges
//   - error: nil if token is valid, or an error describing validation failure
func VerifyJWT(tokenString string) (string, bool, error) {
	if tokenString == "" {
		return "", false, errors.New("empty token")
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecret, nil
	})
	if err != nil {
		return "", false, err
	}
	if !token.Valid {
		return "", false, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", false, errors.New("invalid claims")
	}

	// Validate expiration if present
	if exp, ok := claims["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return "", false, errors.New("token expired")
		}
	}

	userID, ok := claims["userId"].(string)
	if !ok || userID == "" {
		return "", false, errors.New("userId claim missing")
	}

	isAdmin, _ := claims["isAdmin"].(bool)

	return userID, isAdmin, nil
}
