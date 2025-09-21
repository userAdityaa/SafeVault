'use client'
import { useEffect, useState } from 'react';
import { gqlFetch } from './api';
import { toast } from 'sonner';
import { QUERY_ADMIN_FILE_DOWNLOAD_STATS } from './graphql';
import { Download, Globe, Share, Calendar, FileText, User, TrendingUp, Eye } from 'lucide-react';

interface FileDownloadStats {
  fileId: string;
  ownerId: string;
  totalDownloads: number;
  sharedDownloads: number;
  publicDownloads: number;
  lastDownloadAt?: string;
  file: {
    id: string;
    hash: string;
    originalName: string;
    mimeType: string;
    size: number;
    visibility: string;
    createdAt: string;
  };
  owner: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

export default function AdminDownloadStats() {
  const [stats, setStats] = useState<FileDownloadStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'totalDownloads' | 'lastDownloadAt'>('totalDownloads');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchDownloadStats();
  }, []);

  const fetchDownloadStats = async () => {
    try {
      setLoading(true);
      const data = await gqlFetch<{ adminFileDownloadStats: FileDownloadStats[] }>(
        QUERY_ADMIN_FILE_DOWNLOAD_STATS
      );
      setStats(data.adminFileDownloadStats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load download statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleString() : 'Never';
  };

  const sortedStats = [...stats].sort((a, b) => {
    let aVal, bVal;
    
    if (sortBy === 'totalDownloads') {
      aVal = a.totalDownloads;
      bVal = b.totalDownloads;
    } else {
      aVal = a.lastDownloadAt ? new Date(a.lastDownloadAt).getTime() : 0;
      bVal = b.lastDownloadAt ? new Date(b.lastDownloadAt).getTime() : 0;
    }
    
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const totalStats = stats.reduce(
    (acc, stat) => ({
      totalDownloads: acc.totalDownloads + stat.totalDownloads,
      sharedDownloads: acc.sharedDownloads + stat.sharedDownloads,
      publicDownloads: acc.publicDownloads + stat.publicDownloads,
      filesWithDownloads: acc.filesWithDownloads + (stat.totalDownloads > 0 ? 1 : 0),
    }),
    { totalDownloads: 0, sharedDownloads: 0, publicDownloads: 0, filesWithDownloads: 0 }
  );

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Download Statistics (Admin)</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Download Statistics (Admin)</h2>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Total Downloads</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {totalStats.totalDownloads.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Share className="w-5 h-5 text-green-600" />
            <span className="font-medium">Shared Downloads</span>
          </div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {totalStats.sharedDownloads.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <span className="font-medium">Public Downloads</span>
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {totalStats.publicDownloads.toLocaleString()}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            <span className="font-medium">Active Files</span>
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {totalStats.filesWithDownloads.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'totalDownloads' | 'lastDownloadAt')}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="totalDownloads">Total Downloads</option>
            <option value="lastDownloadAt">Last Download</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Order:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Download className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Download Activity</h3>
          <p>No files have been downloaded yet.</p>
        </div>
      ) : (
        /* File Download Statistics Table */
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shared
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Public
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Download
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedStats.map((stat) => (
                  <tr key={stat.fileId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="font-medium text-gray-900">{stat.file.originalName}</div>
                          <div className="text-sm text-gray-500">
                            {formatBytes(stat.file.size)} • {stat.file.mimeType}
                          </div>
                          <div className="text-xs text-gray-400">
                            Created: {new Date(stat.file.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {stat.owner.name || stat.owner.email}
                          </div>
                          {stat.owner.name && (
                            <div className="text-xs text-gray-500">{stat.owner.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {stat.totalDownloads.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Share className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          {stat.sharedDownloads.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Globe className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-purple-600">
                          {stat.publicDownloads.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formatDate(stat.lastDownloadAt)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Downloaded Files */}
      {stats.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Top Downloaded Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedStats.slice(0, 6).map((stat) => (
              <div key={stat.fileId} className="bg-white border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {stat.file.originalName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      by {stat.owner.name || stat.owner.email}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {stat.totalDownloads}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share className="w-3 h-3 text-green-600" />
                        {stat.sharedDownloads}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-purple-600" />
                        {stat.publicDownloads}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}