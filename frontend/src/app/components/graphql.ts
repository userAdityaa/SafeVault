// Centralized GraphQL documents for file + folder operations

export const QUERY_SEARCH_MY_FILES = `
  query SearchMyFiles($filter: FileSearchFilter!, $pagination: PageInput) {
    searchMyFiles(filter: $filter, pagination: $pagination) {
      edges { cursor node { id userId fileId uploadedAt file { id hash originalName mimeType size refCount visibility createdAt } uploader { email name picture } } }
      pageInfo { endCursor hasNextPage }
      totalCount
    }
  }
`;

export const QUERY_MY_FOLDERS = `
  query MyFolders($parentId: ID) { myFolders(parentId: $parentId) { id name parentId createdAt } }
`;

export const QUERY_MY_FOLDER_FILES = `
  query MyFolderFiles($folderId: ID) { myFolderFiles(folderId: $folderId) { id userId fileId uploadedAt file { id hash originalName mimeType size refCount visibility createdAt } uploader { email name picture } } }
`;

export const QUERY_SHARED_FOLDER_FILES = `
  query SharedFolderFiles($folderId: ID!) { sharedFolderFiles(folderId: $folderId) { id userId fileId uploadedAt file { id hash originalName mimeType size refCount visibility createdAt } uploader { email name picture } } }
`;

export const QUERY_SHARED_FOLDER_SUBFOLDERS = `
  query SharedFolderSubfolders($folderId: ID!) { sharedFolderSubfolders(folderId: $folderId) { id name parentId createdAt } }
`;

export const QUERY_PUBLIC_FOLDER_SUBFOLDERS = `
  query PublicFolderSubfolders($token: String!) { publicFolderSubfolders(token: $token) { id name parentId createdAt } }
`;

export const MUTATION_CREATE_FOLDER = `
  mutation CreateFolder($name: String!, $parentId: ID) { createFolder(name: $name, parentId: $parentId) { id name parentId createdAt } }
`;

export const MUTATION_RENAME_FOLDER = `
  mutation Rename($folderId: ID!, $newName: String!) { renameFolder(folderId: $folderId, newName: $newName) }
`;

export const MUTATION_DELETE_FOLDER = `
  mutation DeleteFolder($folderId: ID!) { deleteFolder(folderId: $folderId) }
`;

export const MUTATION_DELETE_FOLDER_RECURSIVE = `
  mutation DeleteFolderRecursive($folderId: ID!) { deleteFolderRecursive(folderId: $folderId) }
`;

export const MUTATION_UPLOAD_FOLDER = `
  mutation UploadFolder($input: UploadFolderInput!) {
    uploadFolder(input: $input) {
      folder { id name parentId createdAt }
      files { id userId fileId uploadedAt file { id hash originalName mimeType size refCount visibility createdAt } uploader { email name picture } }
      summary { totalFiles totalFolders totalSize }
    }
  }
`;

export const MUTATION_MOVE_USER_FILE = `
  mutation Move($mappingId: ID!, $folderId: ID) { moveUserFile(mappingId: $mappingId, folderId: $folderId) }
`;

export const MUTATION_DELETE_FILE = `
  mutation Delete($fileId: ID!) { deleteFile(fileId: $fileId) }
`;

export const QUERY_FILE_URL = `
  query FileURL($fileId: ID!, $inline: Boolean) { fileURL(fileId: $fileId, inline: $inline) }
`;

// Public link operations
export const MUTATION_CREATE_PUBLIC_FILE_LINK = `
  mutation CreatePublicFileLink($fileId: ID!, $expiresAt: String) {
    createPublicFileLink(fileId: $fileId, expiresAt: $expiresAt) { fileId token url createdAt expiresAt revokedAt }
  }
`;

export const MUTATION_REVOKE_PUBLIC_FILE_LINK = `
  mutation RevokePublicFileLink($fileId: ID!) { revokePublicFileLink(fileId: $fileId) }
`;

export const MUTATION_CREATE_PUBLIC_FOLDER_LINK = `
  mutation CreatePublicFolderLink($folderId: ID!, $expiresAt: String) {
    createPublicFolderLink(folderId: $folderId, expiresAt: $expiresAt) { folderId token url createdAt expiresAt revokedAt }
  }
`;

export const MUTATION_REVOKE_PUBLIC_FOLDER_LINK = `
  mutation RevokePublicFolderLink($folderId: ID!) { revokePublicFolderLink(folderId: $folderId) }
`;

export const QUERY_RESOLVE_PUBLIC_FILE_LINK = `
  query ResolvePublicFileLink($token: String!) {
    resolvePublicFileLink(token: $token) {
      token revoked expiresAt
      file { id hash originalName mimeType size refCount visibility createdAt }
      owner { id email }
    }
  }
`;

export const MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE = `
  mutation AddPublicFileToMyStorage($token: String!) { addPublicFileToMyStorage(token: $token) }
`;

export const QUERY_RESOLVE_PUBLIC_FOLDER_LINK = `
  query ResolvePublicFolderLink($token: String!) {
    resolvePublicFolderLink(token: $token) {
      token revoked expiresAt
      folder { id name parentId createdAt }
      owner { id email }
    }
  }
`;

export const QUERY_PUBLIC_FOLDER_FILES = `
  query PublicFolderFiles($token: String!) {
    publicFolderFiles(token: $token) {
      id userId fileId uploadedAt
      file { id hash originalName mimeType size refCount visibility createdAt }
      uploader { email name picture }
    }
  }
`;

// Download tracking queries
export const QUERY_MY_FILE_DOWNLOADS = `
  query MyFileDownloads($fileId: ID!) {
    myFileDownloads(fileId: $fileId) {
      id
      fileId
      downloadedBy
      ownerId
      downloadType
      shareToken
      ipAddress
      userAgent
      downloadedAt
      file {
        id
        hash
        originalName
        mimeType
        size
        visibility
        createdAt
      }
      downloadedUser {
        id
        email
        name
        picture
      }
      owner {
        id
        email
        name
        picture
      }
    }
  }
`;

export const QUERY_MY_SHARED_FILE_DOWNLOADS = `
  query MySharedFileDownloads {
    mySharedFileDownloads {
      id
      fileId
      downloadedBy
      ownerId
      downloadType
      shareToken
      ipAddress
      userAgent
      downloadedAt
      file {
        id
        hash
        originalName
        mimeType
        size
        visibility
        createdAt
      }
      downloadedUser {
        id
        email
        name
        picture
      }
      owner {
        id
        email
        name
        picture
      }
    }
  }
`;

export const QUERY_ADMIN_FILE_DOWNLOAD_STATS = `
  query AdminFileDownloadStats {
    adminFileDownloadStats {
      fileId
      ownerId
      totalDownloads
      sharedDownloads
      publicDownloads
      lastDownloadAt
      file {
        id
        hash
        originalName
        mimeType
        size
        visibility
        createdAt
      }
      owner {
        id
        email
        name
        picture
      }
    }
  }
`;

// File activity tracking mutations
export const MUTATION_TRACK_FILE_ACTIVITY = `
  mutation TrackFileActivity($fileId: ID!, $activityType: String!) {
    trackFileActivity(fileId: $fileId, activityType: $activityType)
  }
`;

// Query for getting recent file activities
export const QUERY_MY_RECENT_FILE_ACTIVITIES = `
  query MyRecentFileActivities($limit: Int) {
    myRecentFileActivities(limit: $limit) {
      fileId
      userId
      lastActivityType
      lastActivityAt
      activityCount
      file {
        id
        hash
        originalName
        mimeType
        size
        refCount
        visibility
        createdAt
      }
    }
  }
`;

// Starred operations
export const QUERY_MY_STARRED_FILES = `
  query MyStarredFiles {
    myStarredFiles {
      id
      userId
      itemType
      itemId
      starredAt
      file {
        id
        hash
        originalName
        mimeType
        size
        refCount
        visibility
        createdAt
      }
    }
  }
`;

export const QUERY_MY_STARRED_FOLDERS = `
  query MyStarredFolders {
    myStarredFolders {
      id
      userId
      itemType
      itemId
      starredAt
      folder {
        id
        name
        parentId
        createdAt
      }
    }
  }
`;

export const QUERY_MY_STARRED_ITEMS = `
  query MyStarredItems {
    myStarredItems {
      id
      userId
      itemType
      itemId
      starredAt
    }
  }
`;

export const MUTATION_STAR_FILE = `
  mutation StarFile($fileId: ID!) {
    starFile(fileId: $fileId)
  }
`;

export const MUTATION_UNSTAR_FILE = `
  mutation UnstarFile($fileId: ID!) {
    unstarFile(fileId: $fileId)
  }
`;

export const MUTATION_STAR_FOLDER = `
  mutation StarFolder($folderId: ID!) {
    starFolder(folderId: $folderId)
  }
`;

export const MUTATION_UNSTAR_FOLDER = `
  mutation UnstarFolder($folderId: ID!) {
    unstarFolder(folderId: $folderId)
  }
`;
