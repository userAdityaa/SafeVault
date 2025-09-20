package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("supersecretkey")

func GenerateJWT(userID string, isAdmin bool) (string, error) {
	claims := jwt.MapClaims{
		"userId":  userID,
		"isAdmin": isAdmin,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

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
