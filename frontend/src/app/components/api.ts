/**
 * @fileoverview API utilities for SnapVault frontend application.
 * This module provides helper functions for GraphQL communication, authentication,
 * and file operations including public link management and file activity tracking.
 */

import { QUERY_FILE_URL, MUTATION_CREATE_PUBLIC_FILE_LINK, MUTATION_REVOKE_PUBLIC_FILE_LINK, MUTATION_CREATE_PUBLIC_FOLDER_LINK, MUTATION_REVOKE_PUBLIC_FOLDER_LINK, QUERY_RESOLVE_PUBLIC_FILE_LINK, MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE, MUTATION_TRACK_FILE_ACTIVITY, QUERY_MY_RECENT_FILE_ACTIVITIES } from './graphql';
import { GRAPHQL_ENDPOINT } from '@/lib/backend';

/**
 * Information about a public link for sharing files or folders.
 */
interface PublicLinkInfo {
  /** Unique token for accessing the shared content */
  token: string;
  /** Relative URL path for the public link */
  url: string;
  /** Optional expiration timestamp */
  expiresAt?: string | null;
  /** Timestamp when link was revoked (if applicable) */
  revokedAt?: string | null;
}

/**
 * Resolved file data from a public link.
 */
interface ResolvedPublicFile {
  /** File identifier */
  id: string;
  /** Original filename */
  originalName: string;
  /** File MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp when file was created */
  createdAt: string;
}

/**
 * Recent file activity data for tracking user interactions.
 */
interface RecentFileActivity {
  /** Activity record identifier */
  id: string;
  /** File that was accessed */
  fileId: string;
  /** Type of activity performed */
  activityType: string;
  /** Most recent activity type */
  lastActivityType: string;
  /** Timestamp of last activity */
  lastActivityAt: string;
  /** Total number of activities on this file */
  activityCount: number;
  /** Associated file data */
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  };
}

const ENDPOINT = GRAPHQL_ENDPOINT;

/**
 * Retrieves the authentication token from localStorage.
 * This token is used to authenticate API requests to the backend.
 * 
 * @returns {string | undefined} The JWT token if available, undefined otherwise
 */
export function getAuthToken() {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('token') || undefined;
}

/**
 * Generic GraphQL fetch function with automatic authentication.
 * Handles token-based authentication and JSON response parsing.
 * 
 * @template TData - Expected type of the response data
 * @param {string} query - GraphQL query or mutation string
 * @param {Record<string, unknown>} [variables] - Variables for the GraphQL operation
 * @returns {Promise<TData>} Parsed response data
 * @throws {Error} If the request fails or returns errors
 */
async function gqlFetch<TData = unknown>(query: string, variables?: Record<string, unknown>): Promise<TData> {
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

/**
 * Retrieves a signed URL for accessing a file.
 * The URL allows temporary access to files stored in MinIO/S3.
 * 
 * @param {string} fileId - Unique identifier of the file
 * @param {boolean} inline - Whether to display inline or as download
 * @returns {Promise<string>} Signed URL for file access
 */
export async function getFileURL(fileId: string, inline: boolean): Promise<string> {
  const data = await gqlFetch<{ fileURL: string }>(QUERY_FILE_URL, { fileId, inline });
  return data.fileURL;
}

export { gqlFetch };

// Public link helpers

/**
 * Creates a public sharing link for a file.
 * Public links allow unauthenticated users to access shared files.
 * 
 * @param {string} fileId - ID of the file to share
 * @param {string} [expiresAt] - Optional expiration timestamp
 * @returns {Promise<PublicLinkInfo>} Created public link information
 */
export async function createPublicFileLink(fileId: string, expiresAt?: string) {
  const data = await gqlFetch<{ createPublicFileLink: PublicLinkInfo }>(MUTATION_CREATE_PUBLIC_FILE_LINK, { fileId, expiresAt });
  return data.createPublicFileLink;
}

/**
 * Revokes a public sharing link for a file.
 * After revocation, the link will no longer provide access to the file.
 * 
 * @param {string} fileId - ID of the file whose link should be revoked
 * @returns {Promise<boolean>} True if revocation was successful
 */
export async function revokePublicFileLink(fileId: string) {
  await gqlFetch(MUTATION_REVOKE_PUBLIC_FILE_LINK, { fileId });
  return true;
}

/**
 * Creates a public sharing link for a folder and its contents.
 * Public folder links allow unauthenticated users to browse shared folders.
 * 
 * @param {string} folderId - ID of the folder to share
 * @param {string} [expiresAt] - Optional expiration timestamp
 * @returns {Promise<PublicLinkInfo>} Created public link information
 */
export async function createPublicFolderLink(folderId: string, expiresAt?: string) {
  const data = await gqlFetch<{ createPublicFolderLink: PublicLinkInfo }>(MUTATION_CREATE_PUBLIC_FOLDER_LINK, { folderId, expiresAt });
  return data.createPublicFolderLink;
}

/**
 * Revokes a public sharing link for a folder.
 * After revocation, the link will no longer provide access to the folder.
 * 
 * @param {string} folderId - ID of the folder whose link should be revoked
 * @returns {Promise<boolean>} True if revocation was successful
 */
export async function revokePublicFolderLink(folderId: string) {
  await gqlFetch(MUTATION_REVOKE_PUBLIC_FOLDER_LINK, { folderId });
  return true;
}

/**
 * Resolves a public file link token to get file information.
 * Used to display file details on public sharing pages.
 * 
 * @param {string} token - Public link token to resolve
 * @returns {Promise<ResolvedPublicFile>} File information if link is valid
 */
export async function resolvePublicFileLink(token: string) {
  const data = await gqlFetch<{ resolvePublicFileLink: ResolvedPublicFile }>(QUERY_RESOLVE_PUBLIC_FILE_LINK, { token });
  return data.resolvePublicFileLink;
}

/**
 * Adds a publicly shared file to the current user's storage.
 * This creates a user-file association for files accessed via public links.
 * 
 * @param {string} token - Public link token for the file to add
 * @returns {Promise<boolean>} True if file was successfully added
 */
export async function addPublicFileToMyStorage(token: string) {
  await gqlFetch(MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE, { token });
  return true;
}

// File activity tracking

/**
 * Tracks user activity on a file for analytics and recent activity features.
 * Activity tracking is non-critical and failures are handled gracefully.
 * 
 * @param {string} fileId - ID of the file being accessed
 * @param {'preview' | 'download'} activityType - Type of activity being performed
 * @returns {Promise<any>} Activity tracking result (if successful)
 */
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

/**
 * Retrieves the user's recent file activities for the dashboard.
 * Shows recently accessed files to improve user experience.
 * 
 * @param {number} [limit=10] - Maximum number of activities to return
 * @returns {Promise<RecentFileActivity[]>} List of recent file activities
 */
export async function getRecentFileActivities(limit = 10) {
  console.log('Fetching recent file activities with limit:', limit);
  const data = await gqlFetch<{ myRecentFileActivities: RecentFileActivity[] }>(QUERY_MY_RECENT_FILE_ACTIVITIES, { limit });
  console.log('Recent file activities response:', data);
  return data.myRecentFileActivities;
}
