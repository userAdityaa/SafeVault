export type GqlFile = {
  id: string;
  hash: string;
  originalName: string;
  mimeType: string;
  size: number;
  refCount: number;
  visibility: string;
  createdAt: string;
};

export type GqlUserFile = {
  id: string;
  userId: string;
  fileId: string;
  uploadedAt: string;
  file: GqlFile;
  uploader: { email: string; name?: string | null; picture?: string | null };
};

export type GqlFolder = { id: string; name: string; parentId?: string | null; createdAt: string };

export type SearchState = {
  filename: string;
  mimeTypes: string; // comma-separated
  sizeMinMB: string;
  sizeMaxMB: string;
  createdAfter: string; // datetime-local
  createdBefore: string; // datetime-local
  tags: string; // comma-separated
  uploaderName: string;
};

export interface PublicFileLink {
  fileId: string;
  token: string;
  url: string; // relative /share/{token}
  createdAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

export interface PublicFileLinkResolved {
  token: string;
  revoked: boolean;
  expiresAt?: string | null;
  file: GqlFile;
  owner: { id: string; email: string };
}

export type GqlStarredFile = {
  id: string;
  userId: string;
  itemType: string;
  itemId: string;
  starredAt: string;
  file: GqlFile;
};

export type GqlStarredFolder = {
  id: string;
  userId: string;
  itemType: string;
  itemId: string;
  starredAt: string;
  folder: GqlFolder;
};

export type GqlStarredItem = {
  id: string;
  userId: string;
  itemType: string;
  itemId: string;
  starredAt: string;
};
