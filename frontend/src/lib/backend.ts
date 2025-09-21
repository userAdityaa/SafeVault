// Utility to determine backend base URL with PROD first, fallback to DEV.
// Normalizes by removing any trailing slash.

function normalize(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

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

export const BACKEND_BASE_URL = getBackendBaseURL();
export const GRAPHQL_ENDPOINT = `${BACKEND_BASE_URL}/query`; // Your server exposes /query per current usage.

export function apiPath(path: string): string {
  if (!BACKEND_BASE_URL) return path; // fallback raw
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}
