# SafeVault GraphQL API Schema Documentation

This document provides comprehensive documentation for the SafeVault GraphQL API, including detailed descriptions, examples, and usage patterns.

## Schema Definition

```graphql
# Custom scalar type for file uploads
scalar Upload

# Authentication Types

"""
Represents the response payload for authentication operations.
Contains the JWT token and user information.
"""
type AuthPayload {
  """
  JWT token for authenticating subsequent requests
  """
  token: String!
  """
  User information for the authenticated user
  """
  user: User!
}

"""
Input type for user registration.
"""
input SignupInput {
  """
  User's email address. Must be unique in the system.
  """
  email: String!
  """
  User's password. Should meet security requirements.
  """
  password: String!
}

"""
Input type for user login.
"""
input LoginInput {
  """
  User's registered email address
  """
  email: String!
  """
  User's password
  """
  password: String!
}

"""
Input type for Google OAuth login.
"""
input GoogleLoginInput {
  """
  Google ID token received from Google OAuth flow
  """
  idToken: String!
}

# File Management Types

"""
Represents a file stored in the system.
Files are deduplicated by hash and can be shared across multiple users.
"""
type File {
  """
  Unique identifier for the file
  """
  id: ID!
  """
  SHA-256 hash of the file content for deduplication
  """
  hash: String!
  """
  Original filename when uploaded
  """
  originalName: String!
  """
  MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
  """
  mimeType: String!
  """
  File size in bytes
  """
  size: Int!
  """
  Number of users who have this file in their storage
  """
  refCount: Int!
  """
  File visibility setting ('private', 'shared', 'public')
  """
  visibility: String!
  """
  Timestamp when the file was first uploaded to the system
  """
  createdAt: String!
}

"""
Represents the relationship between a user and a file.
Multiple users can have the same file through deduplication.
"""
type UserFile {
  """
  Unique identifier for this user-file mapping
  """
  id: ID!
  """
  ID of the user who has this file
  """
  userId: ID!
  """
  ID of the file
  """
  fileId: ID!
  """
  Timestamp when this user uploaded or acquired this file
  """
  uploadedAt: String!
  """
  The actual file data
  """
  file: File!
  """
  Information about who originally uploaded this file
  """
  uploader: Uploader
}

"""
Input type for file upload operations.
"""
input UploadFileInput {
  """
  Array of files to upload
  """
  files: [Upload!]!
  """
  Whether to allow duplicate files in user's storage
  """
  allowDuplicate: Boolean
}

"""
Input type for folder upload operations.
Supports uploading entire folder structures with multiple files.
"""
input UploadFolderInput {
  """
  Name of the root folder to create
  """
  folderName: String!
  """
  Array of file input specifications with relative paths
  """
  files: [FolderFileInput!]!
  """
  Whether to allow duplicate files in user's storage
  """
  allowDuplicate: Boolean
}

"""
Input specification for a file within a folder upload.
"""
input FolderFileInput {
  """
  Relative path of the file within the folder structure
  """
  relativePath: String!
  """
  The actual file to upload
  """
  file: Upload!
}

"""
Response type for folder upload operations.
Contains information about the created folder and uploaded files.
"""
type UploadFolderResponse {
  """
  The root folder that was created
  """
  folder: Folder!
  """
  Array of uploaded files with their user file mappings
  """
  files: [UserFile!]!
  """
  Summary statistics about the upload
  """
  summary: UploadSummary!
}

"""
Summary statistics for folder upload operations.
"""
type UploadSummary {
  """
  Total number of files uploaded
  """
  totalFiles: Int!
  """
  Total number of folders created
  """
  totalFolders: Int!
  """
  Total size of uploaded content in bytes
  """
  totalSize: Int!
}

"""
Represents the uploader of a file.
Can originate from either regular users or Google users.
"""
type Uploader {
  """
  Email address of the uploader
  """
  email: String!
  """
  Display name of the uploader
  """
  name: String
  """
  Profile picture URL of the uploader
  """
  picture: String
}

# User Types

"""
Represents a user in the system.
"""
type User {
  """
  Unique identifier for the user
  """
  id: ID!
  """
  User's email address
  """
  email: String!
  """
  User's display name
  """
  name: String
  """
  User's profile picture URL
  """
  picture: String
  """
  Timestamp when the user account was created
  """
  createdAt: String!
  """
  Timestamp when the user account was last updated
  """
  updatedAt: String!
  """
  Whether the user has admin privileges
  """
  isAdmin: Boolean!
}

"""
Extended user information for admin queries.
Includes storage statistics and file counts.
"""
type AdminUserInfo {
  """
  Unique identifier for the user
  """
  id: ID!
  """
  User's email address
  """
  email: String!
  """
  User's display name
  """
  name: String
  """
  User's profile picture URL
  """
  picture: String
  """
  Timestamp when the user account was created
  """
  createdAt: String!
  """
  Timestamp when the user account was last updated
  """
  updatedAt: String!
  """
  Total number of files owned by the user
  """
  totalFiles: Int!
  """
  Total number of folders owned by the user
  """
  totalFolders: Int!
  """
  Total storage used by the user in bytes
  """
  storageUsed: Int!
}

# Storage Types

"""
Represents storage usage statistics for a user.
"""
type StorageUsage {
  """
  Number of bytes currently used
  """
  usedBytes: Int!
  """
  Total quota in bytes
  """
  quotaBytes: Int!
  """
  Percentage of quota used (0-100)
  """
  percentUsed: Float!
  """
  Bytes saved through deduplication
  """
  savingsBytes: Int!
  """
  Percentage saved through deduplication (0-100)
  """
  savingsPercent: Float!
}

# Folder Types

"""
Represents a folder in the user's file hierarchy.
"""
type Folder {
  """
  Unique identifier for the folder
  """
  id: ID!
  """
  Name of the folder
  """
  name: String!
  """
  ID of the parent folder (null for root folders)
  """
  parentId: ID
  """
  Timestamp when the folder was created
  """
  createdAt: String!
}

# Search and Pagination Types

"""
Input filter for searching files.
All fields are optional and combined with AND logic.
"""
input FileSearchFilter {
  """
  Filter by filename (partial match)
  """
  filename: String
  """
  Filter by MIME types (exact match, OR logic)
  """
  mimeTypes: [String!]
  """
  Minimum file size in bytes
  """
  sizeMin: Int
  """
  Maximum file size in bytes
  """
  sizeMax: Int
  """
  Files created after this timestamp
  """
  createdAfter: String
  """
  Files created before this timestamp
  """
  createdBefore: String
  """
  Filter by tags (AND logic)
  """
  tags: [String!]
  """
  Filter by uploader name (partial match)
  """
  uploaderName: String
}

"""
Input for pagination parameters.
"""
input PageInput {
  """
  Maximum number of items to return
  """
  limit: Int
  """
  Cursor for pagination (from previous query)
  """
  cursor: String
}

"""
Edge in a paginated connection.
"""
type UserFileEdge {
  """
  Cursor for this item
  """
  cursor: String!
  """
  The actual item
  """
  node: UserFile!
}

"""
Pagination information.
"""
type PageInfo {
  """
  Cursor of the last item in this page
  """
  endCursor: String
  """
  Whether there are more items after this page
  """
  hasNextPage: Boolean!
}

"""
Paginated connection for user files.
"""
type UserFileConnection {
  """
  List of edges containing items and cursors
  """
  edges: [UserFileEdge!]!
  """
  Pagination information
  """
  pageInfo: PageInfo!
  """
  Total count of items (may be expensive to compute)
  """
  totalCount: Int!
}

# Sharing Types

"""
Represents a file shared with another user.
"""
type FileShare {
  """
  Unique identifier for this share
  """
  id: ID!
  """
  ID of the shared file
  """
  fileId: ID!
  """
  ID of the file owner
  """
  ownerId: ID!
  """
  Email address of the user the file is shared with
  """
  sharedWithEmail: String!
  """
  ID of the user the file is shared with (if they have an account)
  """
  sharedWithId: ID
  """
  Permission level ('viewer' - read only)
  """
  permission: String!
  """
  Timestamp when the file was shared
  """
  sharedAt: String!
  """
  Optional expiration timestamp
  """
  expiresAt: String
  """
  The shared file
  """
  file: File!
  """
  The owner of the file
  """
  owner: User!
  """
  The user the file is shared with (if they have an account)
  """
  sharedWithUser: User
}

"""
Represents a folder shared with another user.
"""
type FolderShare {
  """
  Unique identifier for this share
  """
  id: ID!
  """
  ID of the shared folder
  """
  folderId: ID!
  """
  ID of the folder owner
  """
  ownerId: ID!
  """
  Email address of the user the folder is shared with
  """
  sharedWithEmail: String!
  """
  ID of the user the folder is shared with (if they have an account)
  """
  sharedWithId: ID
  """
  Permission level ('viewer' - read only)
  """
  permission: String!
  """
  Timestamp when the folder was shared
  """
  sharedAt: String!
  """
  Optional expiration timestamp
  """
  expiresAt: String
  """
  The shared folder
  """
  folder: Folder!
  """
  The owner of the folder
  """
  owner: User!
  """
  The user the folder is shared with (if they have an account)
  """
  sharedWithUser: User
}

"""
Represents a file that has been shared with the current user.
"""
type SharedFileWithMe {
  """
  Unique identifier for this share
  """
  id: ID!
  """
  ID of the shared file
  """
  fileId: ID!
  """
  ID of the file owner
  """
  ownerId: ID!
  """
  Email address the file was shared with
  """
  sharedWithEmail: String!
  """
  Permission level for this share
  """
  permission: String!
  """
  Timestamp when the file was shared
  """
  sharedAt: String!
  """
  The shared file
  """
  file: File!
  """
  The owner of the file
  """
  owner: User!
}

"""
Represents a folder that has been shared with the current user.
"""
type SharedFolderWithMe {
  """
  Unique identifier for this share
  """
  id: ID!
  """
  ID of the shared folder
  """
  folderId: ID!
  """
  ID of the folder owner
  """
  ownerId: ID!
  """
  Email address the folder was shared with
  """
  sharedWithEmail: String!
  """
  Permission level for this share
  """
  permission: String!
  """
  Timestamp when the folder was shared
  """
  sharedAt: String!
  """
  The shared folder
  """
  folder: Folder!
  """
  The owner of the folder
  """
  owner: User!
}

"""
Input for sharing a file with other users.
"""
input ShareFileInput {
  """
  ID of the file to share
  """
  fileId: ID!
  """
  List of email addresses to share with
  """
  emails: [String!]!
  """
  Permission level (currently only 'viewer' is supported)
  """
  permission: String!
  """
  Optional expiration timestamp
  """
  expiresAt: String
}

"""
Input for sharing a folder with other users.
"""
input ShareFolderInput {
  """
  ID of the folder to share
  """
  folderId: ID!
  """
  List of email addresses to share with
  """
  emails: [String!]!
  """
  Permission level (currently only 'viewer' is supported)
  """
  permission: String!
  """
  Optional expiration timestamp
  """
  expiresAt: String
}

# Public Link Types

"""
Represents a public link for a file.
Anyone with the link can access the file without authentication.
"""
type PublicFileLink {
  """
  ID of the linked file
  """
  fileId: ID!
  """
  Unique token for accessing the file
  """
  token: String!
  """
  Public URL path (client constructs full URL)
  """
  url: String!
  """
  Timestamp when the link was created
  """
  createdAt: String!
  """
  Optional expiration timestamp
  """
  expiresAt: String
  """
  Timestamp when the link was revoked (if applicable)
  """
  revokedAt: String
}

"""
Represents a public link for a folder.
Anyone with the link can browse the folder without authentication.
"""
type PublicFolderLink {
  """
  ID of the linked folder
  """
  folderId: ID!
  """
  Unique token for accessing the folder
  """
  token: String!
  """
  Public URL path (client constructs full URL)
  """
  url: String!
  """
  Timestamp when the link was created
  """
  createdAt: String!
  """
  Optional expiration timestamp
  """
  expiresAt: String
  """
  Timestamp when the link was revoked (if applicable)
  """
  revokedAt: String
}

"""
Resolved public file link information.
Returned when accessing a public file link.
"""
type PublicFileLinkResolved {
  """
  The token used to access this file
  """
  token: String!
  """
  The linked file
  """
  file: File!
  """
  The owner of the file
  """
  owner: User!
  """
  Optional expiration timestamp
  """
  expiresAt: String
  """
  Whether the link has been revoked
  """
  revoked: Boolean!
}

"""
Resolved public folder link information.
Returned when accessing a public folder link.
"""
type PublicFolderLinkResolved {
  """
  The token used to access this folder
  """
  token: String!
  """
  The linked folder
  """
  folder: Folder!
  """
  The owner of the folder
  """
  owner: User!
  """
  Optional expiration timestamp
  """
  expiresAt: String
  """
  Whether the link has been revoked
  """
  revoked: Boolean!
}

# Download Tracking Types

"""
Represents a file download event.
Tracks when and how files are downloaded for analytics.
"""
type FileDownload {
  """
  Unique identifier for this download event
  """
  id: ID!
  """
  ID of the downloaded file
  """
  fileId: ID!
  """
  ID of the user who downloaded (null for anonymous)
  """
  downloadedBy: ID
  """
  ID of the file owner
  """
  ownerId: ID!
  """
  Type of download ('shared' or 'public')
  """
  downloadType: String!
  """
  Share token if downloaded via public link
  """
  shareToken: String
  """
  IP address of the downloader
  """
  ipAddress: String!
  """
  User agent of the downloader
  """
  userAgent: String!
  """
  Timestamp of the download
  """
  downloadedAt: String!
  """
  The downloaded file
  """
  file: File!
  """
  The user who downloaded (if authenticated)
  """
  downloadedUser: User
  """
  The owner of the file
  """
  owner: User!
}

"""
Aggregated download statistics for a file.
"""
type FileDownloadStats {
  """
  ID of the file
  """
  fileId: ID!
  """
  ID of the file owner
  """
  ownerId: ID!
  """
  Total number of downloads
  """
  totalDownloads: Int!
  """
  Number of downloads via sharing
  """
  sharedDownloads: Int!
  """
  Number of downloads via public links
  """
  publicDownloads: Int!
  """
  Timestamp of the most recent download
  """
  lastDownloadAt: String
  """
  The file these stats are for
  """
  file: File!
  """
  The owner of the file
  """
  owner: User!
}

# Activity Tracking Types

"""
Represents a user's activity on a file.
Tracks when users preview or download files.
"""
type FileActivity {
  """
  Unique identifier for this activity
  """
  id: ID!
  """
  ID of the file
  """
  fileId: ID!
  """
  ID of the user who performed the activity
  """
  userId: ID!
  """
  Type of activity ('preview' or 'download')
  """
  activityType: String!
  """
  Timestamp of the activity
  """
  activityAt: String!
  """
  The file the activity was performed on
  """
  file: File!
  """
  The user who performed the activity
  """
  user: User!
}

"""
Aggregated recent activity for a file.
Shows the most recent activity and total count.
"""
type RecentFileActivity {
  """
  ID of the file
  """
  fileId: ID!
  """
  ID of the user
  """
  userId: ID!
  """
  Type of the most recent activity
  """
  lastActivityType: String!
  """
  Timestamp of the most recent activity
  """
  lastActivityAt: String!
  """
  Total number of activities by this user on this file
  """
  activityCount: Int!
  """
  The file the activity was performed on
  """
  file: File!
}

# Starred Items Types

"""
Represents a starred item (file or folder).
Generic type for starred items.
"""
type StarredItem {
  """
  Unique identifier for this starred item
  """
  id: ID!
  """
  ID of the user who starred the item
  """
  userId: ID!
  """
  Type of item ('file' or 'folder')
  """
  itemType: String!
  """
  ID of the starred item
  """
  itemId: ID!
  """
  Timestamp when the item was starred
  """
  starredAt: String!
}

"""
Represents a starred file with file details.
"""
type StarredFile {
  """
  Unique identifier for this starred item
  """
  id: ID!
  """
  ID of the user who starred the file
  """
  userId: ID!
  """
  Type of item (always 'file')
  """
  itemType: String!
  """
  ID of the starred file
  """
  itemId: ID!
  """
  Timestamp when the file was starred
  """
  starredAt: String!
  """
  The starred file
  """
  file: File!
}

"""
Represents a starred folder with folder details.
"""
type StarredFolder {
  """
  Unique identifier for this starred item
  """
  id: ID!
  """
  ID of the user who starred the folder
  """
  userId: ID!
  """
  Type of item (always 'folder')
  """
  itemType: String!
  """
  ID of the starred folder
  """
  itemId: ID!
  """
  Timestamp when the folder was starred
  """
  starredAt: String!
  """
  The starred folder
  """
  folder: Folder!
}

# Root Types

"""
Available queries for reading data from the SafeVault API.
Most queries require authentication via JWT token in the Authorization header.
"""
type Query {
  """
  Health check endpoint
  """
  _health: String!

  # File Queries
  """
  Get all files owned by the current user
  """
  myFiles: [UserFile!]!
  """
  Get files in a specific folder (or root if folderId is null)
  """
  myFolderFiles(folderId: ID): [UserFile!]!
  """
  Get all deleted files owned by the current user
  """
  myDeletedFiles: [UserFile!]!
  """
  Get storage usage statistics for the current user
  """
  myStorage: StorageUsage!
  """
  Find a file by its hash in the current user's storage
  """
  findMyFileByHash(hash: String!): UserFile
  """
  Get a download URL for a file
  """
  fileURL(fileId: ID!, inline: Boolean): String!
  """
  Search files with advanced filters and pagination
  """
  searchMyFiles(
    filter: FileSearchFilter!
    pagination: PageInput
  ): UserFileConnection!

  # Folder Queries
  """
  Get folders owned by the current user
  """
  myFolders(parentId: ID): [Folder!]!

  # Sharing Queries
  """
  Get files that have been shared with the current user
  """
  sharedFilesWithMe: [SharedFileWithMe!]!
  """
  Get folders that have been shared with the current user
  """
  sharedFoldersWithMe: [SharedFolderWithMe!]!
  """
  Get files in a shared folder
  """
  sharedFolderFiles(folderId: ID!): [UserFile!]!
  """
  Get subfolders in a shared folder
  """
  sharedFolderSubfolders(folderId: ID!): [Folder!]!
  """
  Get all shares for a specific file (owner only)
  """
  fileShares(fileId: ID!): [FileShare!]!
  """
  Get all shares for a specific folder (owner only)
  """
  folderShares(folderId: ID!): [FolderShare!]!

  # Public Link Queries (no authentication required)
  """
  Resolve a public file link token
  """
  resolvePublicFileLink(token: String!): PublicFileLinkResolved
  """
  Resolve a public folder link token
  """
  resolvePublicFolderLink(token: String!): PublicFolderLinkResolved
  """
  Get files in a public folder
  """
  publicFolderFiles(token: String!): [UserFile!]!
  """
  Get subfolders in a public folder
  """
  publicFolderSubfolders(token: String!): [Folder!]!

  # Admin Queries (admin only)
  """
  Get all users in the system (admin only)
  """
  adminAllUsers: [AdminUserInfo!]!
  """
  Get files for a specific user (admin only)
  """
  adminUserFiles(userId: ID!): [UserFile!]!
  """
  Get folders for a specific user (admin only)
  """
  adminUserFolders(userId: ID!): [Folder!]!
  """
  Get download statistics for all files (admin only)
  """
  adminFileDownloadStats: [FileDownloadStats!]!

  # Download Tracking Queries
  """
  Get download history for a specific file (owner only)
  """
  myFileDownloads(fileId: ID!): [FileDownload!]!
  """
  Get download history for all shared files (owner only)
  """
  mySharedFileDownloads: [FileDownload!]!

  # Activity Tracking Queries
  """
  Get recent file activities for the current user
  """
  myRecentFileActivities(limit: Int): [RecentFileActivity!]!

  # Starred Items Queries
  """
  Get all starred files for the current user
  """
  myStarredFiles: [StarredFile!]!
  """
  Get all starred folders for the current user
  """
  myStarredFolders: [StarredFolder!]!
  """
  Get all starred items (files and folders) for the current user
  """
  myStarredItems: [StarredItem!]!
}

"""
Available mutations for modifying data in the SafeVault API.
All mutations except authentication require a valid JWT token.
"""
type Mutation {
  # Authentication Mutations
  """
  Register a new user account
  """
  signup(input: SignupInput!): AuthPayload!
  """
  Login with email and password
  """
  login(input: LoginInput!): AuthPayload!
  """
  Login with Google OAuth
  """
  googleLogin(input: GoogleLoginInput!): AuthPayload!

  # File Mutations
  """
  Upload one or more files
  """
  uploadFiles(input: UploadFileInput!): [UserFile!]!
  """
  Soft delete a file (move to trash)
  """
  deleteFile(fileId: ID!): Boolean!
  """
  Recover a deleted file from trash
  """
  recoverFile(fileId: ID!): Boolean!
  """
  Permanently delete a file
  """
  purgeFile(fileId: ID!): Boolean!

  # Folder Mutations
  """
  Create a new folder
  """
  createFolder(name: String!, parentId: ID): Folder!
  """
  Rename an existing folder
  """
  renameFolder(folderId: ID!, newName: String!): Boolean!
  """
  Delete a folder and all its contents
  """
  deleteFolder(folderId: ID!): Boolean!
  """
  Delete a folder and all its contents recursively
  """
  deleteFolderRecursive(folderId: ID!): Boolean!
  """
  Upload an entire folder structure with multiple files
  """
  uploadFolder(input: UploadFolderInput!): UploadFolderResponse!
  """
  Move a file to a different folder
  """
  moveUserFile(mappingId: ID!, folderId: ID): Boolean!

  # Sharing Mutations
  """
  Share a file with other users
  """
  shareFile(input: ShareFileInput!): FileShare!
  """
  Share a folder with other users
  """
  shareFolder(input: ShareFolderInput!): FolderShare!
  """
  Revoke sharing of a file with a specific user
  """
  unshareFile(fileId: ID!, sharedWithEmail: String!): Boolean!
  """
  Revoke sharing of a folder with a specific user
  """
  unshareFolder(folderId: ID!, sharedWithEmail: String!): Boolean!

  # Public Link Mutations
  """
  Create a public link for a file
  """
  createPublicFileLink(fileId: ID!, expiresAt: String): PublicFileLink!
  """
  Revoke a public link for a file
  """
  revokePublicFileLink(fileId: ID!): Boolean!
  """
  Create a public link for a folder
  """
  createPublicFolderLink(folderId: ID!, expiresAt: String): PublicFolderLink!
  """
  Revoke a public link for a folder
  """
  revokePublicFolderLink(folderId: ID!): Boolean!
  """
  Add a publicly linked file to your storage
  """
  addPublicFileToMyStorage(token: String!): Boolean!

  # Activity Tracking Mutations
  """
  Track file activity (preview or download)
  """
  trackFileActivity(fileId: ID!, activityType: String!): Boolean!

  # Starred Items Mutations
  """
  Star a file
  """
  starFile(fileId: ID!): Boolean!
  """
  Unstar a file
  """
  unstarFile(fileId: ID!): Boolean!
  """
  Star a folder
  """
  starFolder(folderId: ID!): Boolean!
  """
  Unstar a folder
  """
  unstarFolder(folderId: ID!): Boolean!
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. **Email/Password**: Use the `login` mutation
2. **Google OAuth**: Use the `googleLogin` mutation
3. **New Account**: Use the `signup` mutation

## Example Queries and Mutations

### Authentication Examples

```graphql
# Register a new user
mutation Signup {
  signup(input: { email: "user@example.com", password: "securepassword123" }) {
    token
    user {
      id
      email
      name
      isAdmin
    }
  }
}

# Login
mutation Login {
  login(input: { email: "user@example.com", password: "securepassword123" }) {
    token
    user {
      id
      email
      name
    }
  }
}
```

### File Management Examples

```graphql
# Get all my files
query MyFiles {
  myFiles {
    id
    uploadedAt
    file {
      id
      originalName
      mimeType
      size
      hash
    }
    uploader {
      email
      name
    }
  }
}

# Upload files (requires multipart/form-data)
mutation UploadFiles($files: [Upload!]!) {
  uploadFiles(input: { files: $files, allowDuplicate: false }) {
    id
    file {
      id
      originalName
      mimeType
      size
    }
  }
}

# Upload folder (requires multipart/form-data)
mutation UploadFolder($input: UploadFolderInput!) {
  uploadFolder(input: $input) {
    folder {
      id
      name
      parentId
    }
    files {
      id
      file {
        originalName
        mimeType
        size
      }
    }
    summary {
      totalFiles
      totalFolders
      totalSize
    }
  }
}

# Search files
query SearchFiles {
  searchMyFiles(
    filter: {
      filename: "report"
      mimeTypes: ["application/pdf", "text/plain"]
      sizeMin: 1024
      sizeMax: 10485760
    }
    pagination: { limit: 20 }
  ) {
    edges {
      cursor
      node {
        id
        file {
          originalName
          mimeType
          size
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### Folder Management Examples

```graphql
# Create a folder
mutation CreateFolder {
  createFolder(name: "Documents", parentId: null) {
    id
    name
    parentId
    createdAt
  }
}

# Get folders
query MyFolders {
  myFolders(parentId: null) {
    id
    name
    parentId
    createdAt
  }
}

# Move file to folder
mutation MoveFile {
  moveUserFile(mappingId: "123", folderId: "456")
}

# Upload entire folder
mutation UploadFolder($input: UploadFolderInput!) {
  uploadFolder(input: $input) {
    folder {
      id
      name
      parentId
      createdAt
    }
    files {
      id
      file {
        originalName
        mimeType
        size
      }
    }
    summary {
      totalFiles
      totalFolders
      totalSize
    }
  }
}

# Delete folder recursively
mutation DeleteFolderRecursive {
  deleteFolderRecursive(folderId: "456")
}
```

### Folder Sharing Examples

```graphql
# Share a folder
mutation ShareFolder {
  shareFolder(
    input: {
      folderId: "456"
      emails: ["teammate@example.com"]
      permission: "viewer"
      expiresAt: "2024-12-31T23:59:59Z"
    }
  ) {
    id
    sharedWithEmail
    permission
    sharedAt
    expiresAt
  }
}

# Get shared folder contents
query SharedFolderContents {
  sharedFolderFiles(folderId: "456") {
    id
    file {
      originalName
      mimeType
      size
    }
  }
  sharedFolderSubfolders(folderId: "456") {
    id
    name
    parentId
    createdAt
  }
}
```

### Sharing Examples

```graphql
# Share a file
mutation ShareFile {
  shareFile(
    input: {
      fileId: "123"
      emails: ["colleague@example.com", "friend@example.com"]
      permission: "viewer"
      expiresAt: "2024-12-31T23:59:59Z"
    }
  ) {
    id
    sharedWithEmail
    permission
    sharedAt
    expiresAt
  }
}

# Get files shared with me
query SharedWithMe {
  sharedFilesWithMe {
    id
    permission
    sharedAt
    file {
      originalName
      mimeType
      size
    }
    owner {
      email
      name
    }
  }
}
```

### Public Link Examples

```graphql
# Create public link
mutation CreatePublicLink {
  createPublicFileLink(fileId: "123", expiresAt: "2024-12-31T23:59:59Z") {
    token
    url
    expiresAt
  }
}

# Resolve public link (no auth required)
query ResolvePublicLink {
  resolvePublicFileLink(token: "abc123def456") {
    token
    file {
      originalName
      mimeType
      size
    }
    owner {
      email
      name
    }
    expiresAt
    revoked
  }
}

# Create public folder link
mutation CreatePublicFolderLink {
  createPublicFolderLink(folderId: "456", expiresAt: "2024-12-31T23:59:59Z") {
    token
    url
    expiresAt
  }
}

# Access public folder contents (no auth required)
query PublicFolderContents {
  resolvePublicFolderLink(token: "def456ghi789") {
    folder {
      name
    }
    owner {
      email
    }
    revoked
  }
  publicFolderFiles(token: "def456ghi789") {
    id
    file {
      originalName
      mimeType
      size
    }
  }
  publicFolderSubfolders(token: "def456ghi789") {
    id
    name
    createdAt
  }
}
```

### Activity and Analytics Examples

```graphql
# Track file activity
mutation TrackActivity {
  trackFileActivity(fileId: "123", activityType: "preview")
}

# Get recent activities
query RecentActivities {
  myRecentFileActivities(limit: 10) {
    fileId
    lastActivityType
    lastActivityAt
    activityCount
    file {
      originalName
    }
  }
}

# Get download stats (owner only)
query FileDownloads {
  myFileDownloads(fileId: "123") {
    id
    downloadType
    downloadedAt
    ipAddress
    downloadedUser {
      email
    }
  }
}
```

### Starred Items Examples

```graphql
# Star a file
mutation StarFile {
  starFile(fileId: "123")
}

# Get starred items
query StarredItems {
  myStarredItems {
    id
    itemType
    itemId
    starredAt
  }

  myStarredFiles {
    id
    starredAt
    file {
      originalName
      mimeType
    }
  }
}
```

## Error Handling

The API returns standard GraphQL errors in the following format:

```json
{
  "errors": [
    {
      "message": "Authentication required",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["myFiles"],
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ],
  "data": null
}
```

Common error codes:

- `UNAUTHENTICATED`: No valid token provided
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BAD_USER_INPUT`: Invalid input data
- `INTERNAL_ERROR`: Server error

## Rate Limiting

The API implements rate limiting based on user authentication:

- Authenticated users: Higher limits
- Anonymous users (public links): Lower limits
- File uploads: Special limits based on file size

## File Upload

File uploads use the GraphQL multipart request specification. The upload process:

1. Prepare files as `Upload` scalar type
2. Send multipart/form-data request
3. Map file uploads to variables
4. Execute `uploadFiles` mutation

Example using curl:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F operations='{"query":"mutation($files:[Upload!]!){uploadFiles(input:{files:$files}){id file{originalName}}}","variables":{"files":[null]}}' \
  -F map='{"0":["variables.files.0"]}' \
  -F 0=@/path/to/file.pdf \
  http://localhost:8080/graphql
```

## Folder Upload

Folder uploads support uploading entire directory structures with nested folders and files:

1. Prepare folder structure as `UploadFolderInput`
2. Include all files with their relative paths
3. Send multipart/form-data request with proper mapping
4. Execute `uploadFolder` mutation

Example folder upload using curl:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F operations='{"query":"mutation($input:UploadFolderInput!){uploadFolder(input:$input){folder{name} summary{totalFiles}}}","variables":{"input":{"folderName":"MyProject","files":[{"relativePath":"src/index.js","file":null},{"relativePath":"docs/README.md","file":null}],"allowDuplicate":false}}}' \
  -F map='{"0":["variables.input.files.0.file"],"1":["variables.input.files.1.file"]}' \
  -F 0=@./src/index.js \
  -F 1=@./docs/README.md \
  http://localhost:8080/graphql
```

Key features of folder uploads:

- **Hierarchical Structure**: Maintains original folder and subfolder organization
- **Bulk Processing**: Uploads multiple files in a single operation
- **Deduplication**: Files are still deduplicated based on content hash
- **Progress Tracking**: Returns detailed summary of upload results
- **Error Handling**: Continues processing other files if individual files fail

## Permissions

- **Owner**: Full access to their files and folders
- **Shared Viewer**: Read-only access to shared files/folders
- **Public Link**: Access based on link permissions
- **Admin**: Access to all data and admin queries

## Data Types

- **ID**: String identifier (UUID format)
- **String**: UTF-8 string
- **Int**: 32-bit integer
- **Float**: Double precision floating point
- **Boolean**: true/false
- **Upload**: File upload scalar (multipart)

Timestamps are in ISO 8601 format (RFC 3339): `2024-01-15T10:30:00Z`
