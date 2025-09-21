import { QUERY_FILE_URL, MUTATION_CREATE_PUBLIC_FILE_LINK, MUTATION_REVOKE_PUBLIC_FILE_LINK, MUTATION_CREATE_PUBLIC_FOLDER_LINK, MUTATION_REVOKE_PUBLIC_FOLDER_LINK, QUERY_RESOLVE_PUBLIC_FILE_LINK, MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE, MUTATION_TRACK_FILE_ACTIVITY, QUERY_MY_RECENT_FILE_ACTIVITIES } from './graphql';
import { GRAPHQL_ENDPOINT } from '@/lib/backend';

const ENDPOINT = GRAPHQL_ENDPOINT;

export function getAuthToken() {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('token') || undefined;
}

async function gqlFetch<TData = any>(query: string, variables?: Record<string, any>): Promise<TData> {
  const token = getAuthToken();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL request failed');
  return json.data as TData;
}

export async function getFileURL(fileId: string, inline: boolean): Promise<string> {
  const data = await gqlFetch<{ fileURL: string }>(QUERY_FILE_URL, { fileId, inline });
  return data.fileURL;
}

export { gqlFetch };

// Public link helpers
export async function createPublicFileLink(fileId: string, expiresAt?: string) {
  const data = await gqlFetch<{ createPublicFileLink: any }>(MUTATION_CREATE_PUBLIC_FILE_LINK, { fileId, expiresAt });
  return data.createPublicFileLink;
}

export async function revokePublicFileLink(fileId: string) {
  await gqlFetch(MUTATION_REVOKE_PUBLIC_FILE_LINK, { fileId });
  return true;
}

export async function createPublicFolderLink(folderId: string, expiresAt?: string) {
  const data = await gqlFetch<{ createPublicFolderLink: any }>(MUTATION_CREATE_PUBLIC_FOLDER_LINK, { folderId, expiresAt });
  return data.createPublicFolderLink;
}

export async function revokePublicFolderLink(folderId: string) {
  await gqlFetch(MUTATION_REVOKE_PUBLIC_FOLDER_LINK, { folderId });
  return true;
}

export async function resolvePublicFileLink(token: string) {
  const data = await gqlFetch<{ resolvePublicFileLink: any }>(QUERY_RESOLVE_PUBLIC_FILE_LINK, { token });
  return data.resolvePublicFileLink;
}

export async function addPublicFileToMyStorage(token: string) {
  await gqlFetch(MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE, { token });
  return true;
}

// File activity tracking
export async function trackFileActivity(fileId: string, activityType: 'preview' | 'download') {
  try {
    console.log('Tracking file activity:', { fileId, activityType });
    const result = await gqlFetch(MUTATION_TRACK_FILE_ACTIVITY, { fileId, activityType });
    console.log('Activity tracking result:', result);
    return result;
  } catch (error) {
    // Silently fail - activity tracking is not critical
    console.log('Failed to track file activity:', error);
  }
}

export async function getRecentFileActivities(limit = 10) {
  console.log('Fetching recent file activities with limit:', limit);
  const data = await gqlFetch<{ myRecentFileActivities: any[] }>(QUERY_MY_RECENT_FILE_ACTIVITIES, { limit });
  console.log('Recent file activities response:', data);
  return data.myRecentFileActivities;
}
