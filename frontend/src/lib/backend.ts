/**
 * Backend configuration utilities for API endpoint management.
 * 
 * Provides functions and constants for dynamically determining backend URLs
 * based on environment variables with fallback support.
 */

/**
 * Normalizes a URL string by trimming whitespace and removing trailing slashes.
 * 
 * @param url - The URL string to normalize
 * @returns Normalized URL string or undefined if invalid
 * 
 * @example
 * ```typescript
 * normalize("https://api.example.com/")  // "https://api.example.com"
 * normalize("  ")                        // undefined
 * normalize("")                          // undefined
 * ```
 */
function normalize(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Determines the backend base URL from environment variables.
 * 
 * Prioritizes production URL (NEXT_PUBLIC_PROD_BACKEND_URL) over development URL
 * (NEXT_PUBLIC_DEV_BACKEND_URL). Logs an error in browser console if no URL is configured.
 * 
 * @returns The backend base URL or empty string if not configured
 * 
 * @example
 * ```typescript
 * // With NEXT_PUBLIC_PROD_BACKEND_URL="https://api.prod.com"
 * getBackendBaseURL() // "https://api.prod.com"
 * 
 * // With only NEXT_PUBLIC_DEV_BACKEND_URL="http://localhost:8080"
 * getBackendBaseURL() // "http://localhost:8080"
 * ```
 */
export function getBackendBaseURL(): string {
  const prod = normalize(process.env.NEXT_PUBLIC_PROD_BACKEND_URL || undefined);
  const dev = normalize(process.env.NEXT_PUBLIC_DEV_BACKEND_URL || undefined);
  const chosen = prod || dev;
  if (!chosen) {
    if (typeof window !== 'undefined') {
      // Surface a clear error in the browser console.
      console.error('[backend] No backend URL env set: expected NEXT_PUBLIC_PROD_BACKEND_URL or NEXT_PUBLIC_DEV_BACKEND_URL');
    }
    return '';
  }
  return chosen;
}

/** Backend base URL resolved from environment variables */
export const BACKEND_BASE_URL = getBackendBaseURL();

/** GraphQL endpoint URL for making GraphQL queries and mutations */
export const GRAPHQL_ENDPOINT = `${BACKEND_BASE_URL}/query`;

/**
 * Constructs a full API path by combining the backend base URL with a given path.
 * 
 * @param path - The API path (with or without leading slash)
 * @returns Complete URL combining base URL and path
 * 
 * @example
 * ```typescript
 * // With BACKEND_BASE_URL="https://api.example.com"
 * apiPath("/users")      // "https://api.example.com/users"
 * apiPath("auth/login")  // "https://api.example.com/auth/login"
 * ```
 */
export function apiPath(path: string): string {
  if (!BACKEND_BASE_URL) return path; // fallback raw
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}
