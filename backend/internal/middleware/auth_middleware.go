// Package middleware provides HTTP middleware functions for the SnapVault application.
// It includes authentication middleware for JWT token validation and context injection.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/useradityaa/internal/auth"
)

// contextKey is a private type to avoid key collisions in context.
// Using a custom type ensures our context keys don't conflict with other packages.
type contextKey string

// Context keys for storing user authentication information
const (
	userIDContextKey  contextKey = "userId"
	isAdminContextKey contextKey = "isAdmin"
)

// AuthMiddleware validates the Authorization: Bearer <token> header.
// On success, it injects the `userId` and `isAdmin` from the token into the request context
// and calls the next handler. On failure, it responds with 401 Unauthorized.
// If no Authorization header is provided, the request continues as anonymous.
//
// Parameters:
//   - next: The next HTTP handler in the chain
//
// Returns:
//   - http.Handler: A handler that performs authentication before calling next
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			// No auth provided → pass through as anonymous
			next.ServeHTTP(w, r)
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			http.Error(w, "invalid Authorization header", http.StatusUnauthorized)
			return
		}

		userID, isAdmin, err := auth.VerifyJWT(parts[1])
		if err != nil {
			http.Error(w, "invalid or expired token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDContextKey, userID)
		ctx = context.WithValue(ctx, isAdminContextKey, isAdmin)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserIDFromContext retrieves the authenticated userId set by AuthMiddleware.
// This function should be used in GraphQL resolvers and other handlers to get
// the current user's ID from the request context.
//
// Parameters:
//   - ctx: The request context containing user information
//
// Returns:
//   - string: The user ID if authenticated
//   - bool: true if a valid user ID was found, false otherwise
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	val := ctx.Value(userIDContextKey)
	if id, ok := val.(string); ok && id != "" {
		return id, true
	}
	return "", false
}

// GetIsAdminFromContext retrieves the admin status set by AuthMiddleware.
// This function determines if the current authenticated user has administrative privileges.
//
// Parameters:
//   - ctx: The request context containing user information
//
// Returns:
//   - bool: true if the user is an admin, false otherwise
func GetIsAdminFromContext(ctx context.Context) bool {
	val := ctx.Value(isAdminContextKey)
	if isAdmin, ok := val.(bool); ok {
		return isAdmin
	}
	return false
}
