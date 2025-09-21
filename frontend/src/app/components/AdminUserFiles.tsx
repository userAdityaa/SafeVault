'use client'
import { useEffect, useState } from 'react';
import { gqlFetch } from './api';
import { toast } from 'sonner';
import { User, FolderOpen, FileText, HardDrive } from 'lucide-react';

interface AdminUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
  totalFiles: number;
  totalFolders: number;
  storageUsed: number;
}

interface UserFile {
  id: string;
  userId: string;
  fileId: string;
  uploadedAt: string;
  file: {
    id: string;
    hash: string;
    originalName: string;
    mimeType: string;
    size: number;
    refCount: number;
    visibility: string;
    createdAt: string;
  };
  uploader: {
    email: string;
    name?: string;
    picture?: string;
  };
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

const ADMIN_ALL_USERS_QUERY = `
  query AdminAllUsers {
    adminAllUsers {
      id
      email
      name
      picture
      createdAt
      updatedAt
      totalFiles
      totalFolders
      storageUsed
    }
  }
`;

const ADMIN_USER_FILES_QUERY = `
  query AdminUserFiles($userId: ID!) {
    adminUserFiles(userId: $userId) {
      id
      userId
      fileId
      uploadedAt
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
      uploader {
        email
        name
        picture
      }
    }
  }
`;

const ADMIN_USER_FOLDERS_QUERY = `
  query AdminUserFolders($userId: ID!) {
    adminUserFolders(userId: $userId) {
      id
      name
      parentId
      createdAt
    }
  }
`;

const ADMIN_FILE_DOWNLOAD_STATS_QUERY = `
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

export default function AdminUserFiles() {
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Load all users on component mount
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const data = await gqlFetch<{ adminAllUsers: AdminUserInfo[] }>(ADMIN_ALL_USERS_QUERY);
      setUsers(data.adminAllUsers);
    } catch (error) {
      toast.error('Failed to fetch users', { description: 'Please check your admin permissions' });
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      setLoadingUserData(true);
      const [filesData, foldersData] = await Promise.all([
        gqlFetch<{ adminUserFiles: UserFile[] }>(ADMIN_USER_FILES_QUERY, { userId }),
        gqlFetch<{ adminUserFolders: Folder[] }>(ADMIN_USER_FOLDERS_QUERY, { userId })
      ]);
      setUserFiles(filesData.adminUserFiles);
      setUserFolders(foldersData.adminUserFolders);
    } catch (error) {
      toast.error('Failed to fetch user data', { description: 'Please try again' });
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleUserSelect = async (user: AdminUserInfo) => {
    setSelectedUser(user);
    await fetchUserData(user.id);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">User Files (Admin)</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">User Files (Admin)</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-medium text-gray-800 mb-4">All Users</h3>
          <div className="bg-white rounded-lg border">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <User size={16} className="text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {user.totalFiles} files
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderOpen size={12} />
                    {user.totalFolders} folders
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive size={12} />
                    {formatFileSize(user.storageUsed)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Details */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <>
              <div className="bg-white rounded-lg border p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {selectedUser.name || selectedUser.email}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Files:</span>
                    <p className="font-medium">{selectedUser.totalFiles}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Folders:</span>
                    <p className="font-medium">{selectedUser.totalFolders}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Storage Used:</span>
                    <p className="font-medium">{formatFileSize(selectedUser.storageUsed)}</p>
                  </div>
                </div>
              </div>

              {loadingUserData ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-500">Loading user data...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Folders */}
                  <div className="bg-white rounded-lg border">
                    <div className="px-6 py-4 border-b">
                      <h4 className="font-medium text-gray-800">Folders ({userFolders.length})</h4>
                    </div>
                    <div className="p-4">
                      {userFolders.length > 0 ? (
                        <div className="grid gap-2">
                          {userFolders.map((folder) => (
                            <div key={folder.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                              <FolderOpen size={16} className="text-blue-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{folder.name}</p>
                                <p className="text-xs text-gray-500">
                                  Created {new Date(folder.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No folders found</p>
                      )}
                    </div>
                  </div>

                  {/* Files */}
                  <div className="bg-white rounded-lg border">
                    <div className="px-6 py-4 border-b">
                      <h4 className="font-medium text-gray-800">Files ({userFiles.length})</h4>
                    </div>
                    <div className="p-4">
                      {userFiles.length > 0 ? (
                        <div className="grid gap-2">
                          {userFiles.map((userFile) => (
                            <div key={userFile.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                              <FileText size={16} className="text-gray-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{userFile.file.originalName}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(userFile.file.size)} • {userFile.file.mimeType} • 
                                  Uploaded {new Date(userFile.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No files found</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Select a User</h3>
              <p className="text-gray-500">Choose a user from the list to view their files and folders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}