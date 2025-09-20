package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/useradityaa/internal/auth"
)

// contextKey is a private type to avoid key collisions in context.
type contextKey string

const userIDContextKey contextKey = "userId"
const isAdminContextKey contextKey = "isAdmin"

// AuthMiddleware validates the Authorization: Bearer <token> header.
// On success, it injects the `userId` from the token into the request context
// and calls the next handler. On failure, it responds with 401 Unauthorized.
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
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	val := ctx.Value(userIDContextKey)
	if id, ok := val.(string); ok && id != "" {
		return id, true
	}
	return "", false
}

// GetIsAdminFromContext retrieves the admin status set by AuthMiddleware.
func GetIsAdminFromContext(ctx context.Context) bool {
	val := ctx.Value(isAdminContextKey)
	if isAdmin, ok := val.(bool); ok {
		return isAdmin
	}
	return false
}
