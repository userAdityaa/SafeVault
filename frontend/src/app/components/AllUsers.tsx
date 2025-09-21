'use client'
import { useEffect, useState } from 'react';
import { gqlFetch } from './api';
import { toast } from 'sonner';
import { User, FolderOpen, FileText, HardDrive, Calendar, Mail } from 'lucide-react';
import Avatar from './Avatar';

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

export default function AllUsers() {
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">All Users (Admin)</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">All Users (Admin)</h2>
        <div className="text-sm text-gray-500">
          Total: {users.length} users
        </div>
      </div>
      
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="font-medium text-gray-800">User Overview</h3>
        </div>
        
        {users.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar
                    src={user.picture}
                    alt={`${user.name || user.email} profile`}
                    size={48}
                    fallbackText={user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                  />
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {user.name || 'No name'}
                      </h4>
                      {user.picture && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Google
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-gray-600 mb-3">
                      <Mail size={14} />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{user.totalFiles}</p>
                          <p className="text-gray-500">Files</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FolderOpen size={16} className="text-yellow-600" />
                        <div>
                          <p className="font-medium text-gray-900">{user.totalFolders}</p>
                          <p className="text-gray-500">Folders</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">{formatFileSize(user.storageUsed)}</p>
                          <p className="text-gray-500">Storage</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
                          <p className="text-gray-500">Joined</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <User size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Users Found</h3>
            <p className="text-gray-500">There are no users in the system yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}