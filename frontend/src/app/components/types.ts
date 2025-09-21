/**
 * @fileoverview Type definitions for SnapVault frontend application.
 * This file contains TypeScript interfaces and types that mirror the GraphQL schema
 * and define the data structures used throughout the React application.
 */

/**
 * Represents a file entity in the SnapVault system.
 * Files are deduplicated by hash and can be shared between users.
 */
export type GqlFile = {
  /** Unique identifier for the file */
  id: string;
  /** SHA-256 hash of the file content, used for deduplication */
  hash: string;
  /** Original filename when uploaded */
  originalName: string;
  /** MIME type describing the file content (e.g., "image/jpeg", "application/pdf") */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Number of users who have access to this file */
  refCount: number;
  /** Access level: "private", "public", or "shared" */
  visibility: string;
  /** ISO timestamp when the file was created */
  createdAt: string;
};

/**
 * Represents the association between a user and a file.
 * This is the primary way files are linked to users in the system.
 */
export type GqlUserFile = {
  /** Unique identifier for this user-file association */
  id: string;
  /** ID of the user who has access to the file */
  userId: string;
  /** ID of the file being accessed */
  fileId: string;
  /** ISO timestamp when this association was created */
  uploadedAt: string;
  /** The associated file data */
  file: GqlFile;
  /** Information about the user who originally uploaded the file */
  uploader: { 
    email: string; 
    name?: string | null; 
    picture?: string | null; 
  };
};

/**
 * Represents a folder that can contain files and other folders.
 * Folders form a hierarchical structure for organizing files.
 */
export type GqlFolder = { 
  /** Unique identifier for the folder */
  id: string; 
  /** Display name of the folder */
  name: string; 
  /** ID of the parent folder (null for root-level folders) */
  parentId?: string | null; 
  /** ISO timestamp when the folder was created */
  createdAt: string; 
};

/**
 * State object for file search and filtering functionality.
 * Used to maintain search criteria across component renders.
 */
export type SearchState = {
  /** Filter by filename (partial match) */
  filename: string;
  /** Comma-separated list of MIME types to filter by */
  mimeTypes: string; // comma-separated
  /** Minimum file size in megabytes */
  sizeMinMB: string;
  /** Maximum file size in megabytes */
  sizeMaxMB: string;
  /** Filter files created after this datetime (HTML datetime-local format) */
  createdAfter: string; // datetime-local
  /** Filter files created before this datetime (HTML datetime-local format) */
  createdBefore: string; // datetime-local
  /** Comma-separated list of tags to filter by */
  tags: string; // comma-separated
  /** Filter by uploader's name (partial match) */
  uploaderName: string;
};

/**
 * Represents a public link for sharing files with non-authenticated users.
 * Public links can have expiration dates and can be revoked.
 */
export interface PublicFileLink {
  /** ID of the file this link shares */
  fileId: string;
  /** Unique token for accessing the file */
  token: string;
  /** Relative URL path for accessing the shared file */
  url: string; // relative /share/{token}
  /** ISO timestamp when the link was created */
  createdAt: string;
  /** Optional expiration timestamp for the link */
  expiresAt?: string | null;
  /** Timestamp when the link was revoked (if applicable) */
  revokedAt?: string | null;
}

/**
 * Resolved public file link containing file data and owner information.
 * Used when displaying public file share pages.
 */
export interface PublicFileLinkResolved {
  /** The sharing token */
  token: string;
  /** Whether the link has been revoked */
  revoked: boolean;
  /** Optional expiration timestamp */
  expiresAt?: string | null;
  /** The shared file data */
  file: GqlFile;
  /** Information about the file owner */
  owner: { id: string; email: string };
}

/**
 * Represents a starred file in the user's favorites.
 * Starred items provide quick access to frequently used files.
 */
export type GqlStarredFile = {
  /** Unique identifier for this starred item */
  id: string;
  /** ID of the user who starred the item */
  userId: string;
  /** Type of item ("file") */
  itemType: string;
  /** ID of the starred file */
  itemId: string;
  /** ISO timestamp when the item was starred */
  starredAt: string;
  /** The starred file data */
  file: GqlFile;
};

/**
 * Represents a starred folder in the user's favorites.
 * Starred folders provide quick access to frequently used directories.
 */
export type GqlStarredFolder = {
  /** Unique identifier for this starred item */
  id: string;
  /** ID of the user who starred the item */
  userId: string;
  /** Type of item ("folder") */
  itemType: string;
  /** ID of the starred folder */
  itemId: string;
  /** ISO timestamp when the item was starred */
  starredAt: string;
  /** The starred folder data */
  folder: GqlFolder;
};

/**
 * Generic starred item interface.
 * Base type for starred files and folders.
 */
export type GqlStarredItem = {
  /** Unique identifier for this starred item */
  id: string;
  /** ID of the user who starred the item */
  userId: string;
  /** Type of item ("file" or "folder") */
  itemType: string;
  /** ID of the starred item */
  itemId: string;
  /** ISO timestamp when the item was starred */
  starredAt: string;
};
