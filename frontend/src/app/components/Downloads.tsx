'use client'
import { useEffect, useState } from 'react';
import { gqlFetch } from './api';
import { toast } from 'sonner';
import { QUERY_MY_SHARED_FILE_DOWNLOADS, QUERY_MY_FILE_DOWNLOADS } from './graphql';
import { 
  Calendar, 
  Download, 
  ExternalLink, 
  Globe, 
  Share, 
  Users, 
  File, 
  Clock,
  TrendingUp,
  Eye,
  RefreshCw,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface FileDownload {
  id: string;
  fileId: string;
  downloadedBy?: string;
  ownerId: string;
  downloadType: string;
  shareToken?: string;
  ipAddress: string;
  userAgent: string;
  downloadedAt: string;
  file: {
    id: string;
    hash: string;
    originalName: string;
    mimeType: string;
    size: number;
    visibility: string;
    createdAt: string;
  };
  downloadedUser?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
  owner: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

interface DownloadsProps {
  fileId?: string; // If provided, shows downloads for specific file only
}

export default function Downloads({ fileId }: DownloadsProps) {
  const [downloads, setDownloads] = useState<FileDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDownloads();
  }, [fileId]);

  const fetchDownloads = async () => {
    try {
      const isRefresh = !loading;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      let data;
      
      if (fileId) {
        // Get downloads for specific file
        data = await gqlFetch<{ myFileDownloads: FileDownload[] }>(
          QUERY_MY_FILE_DOWNLOADS,
          { fileId }
        );
        setDownloads(data.myFileDownloads);
      } else {
        // Get all shared file downloads
        data = await gqlFetch<{ mySharedFileDownloads: FileDownload[] }>(
          QUERY_MY_SHARED_FILE_DOWNLOADS
        );
        setDownloads(data.mySharedFileDownloads);
      }
      
      // Debug logging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Downloads data:', data);
        console.log('Downloads count:', downloads.length);
      }
    } catch (error: unknown) {
      console.error('Error fetching downloads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load downloads';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📈';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '📦';
    return '📄';
  };

  const getDownloadTypeIcon = (type: string) => {
    return type === 'public' ? (
      <div className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full">
        <Globe className="w-3 h-3 text-purple-600" />
      </div>
    ) : (
      <div className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
        <Share className="w-3 h-3 text-blue-600" />
      </div>
    );
  };

  const getDownloadTypeLabel = (type: string) => {
    return type === 'public' ? 'Public Link' : 'Shared';
  };

  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  // Group downloads by file
  const groupedDownloads = downloads.reduce((acc, download) => {
    const fileId = download.fileId;
    if (!acc[fileId]) {
      acc[fileId] = {
        file: download.file,
        downloads: [],
        totalDownloads: 0,
        publicDownloads: 0,
        sharedDownloads: 0,
        lastDownload: download.downloadedAt,
      };
    }
    acc[fileId].downloads.push(download);
    acc[fileId].totalDownloads++;
    if (download.downloadType === 'public') {
      acc[fileId].publicDownloads++;
    } else {
      acc[fileId].sharedDownloads++;
    }
    // Update last download if this one is more recent
    if (new Date(download.downloadedAt) > new Date(acc[fileId].lastDownload)) {
      acc[fileId].lastDownload = download.downloadedAt;
    }
    return acc;
  }, {} as Record<string, {
    file: FileDownload['file'];
    downloads: FileDownload[];
    totalDownloads: number;
    publicDownloads: number;
    sharedDownloads: number;
    lastDownload: string;
  }>);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <Download className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 font-medium">Loading downloads...</p>
          <p className="text-sm text-gray-400 mt-1">Fetching your file download analytics</p>
        </div>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-8 sm:py-16 px-4">
        <div className="max-w-md mx-auto">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full mx-auto flex items-center justify-center">
              <Download className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            </div>
          </div>

          {/* Header */}
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No downloads yet</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
            When people download your shared files, you&apos;ll see detailed analytics here.
          </p>
          
          {/* How-to Guide */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 sm:p-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h4 className="text-sm sm:text-base font-semibold text-blue-900">Track Your File Downloads</h4>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-700">1</span>
                </div>
                <p>Share a file with someone via email or generate a public link</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-700">2</span>
                </div>
                <p>Recipients download the file from their &quot;Shared with me&quot; section</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-700">3</span>
                </div>
                <p>View detailed download analytics, user info, and timing here</p>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <button 
            onClick={fetchDownloads}
            disabled={refreshing}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">Debug Info</summary>
              <div className="mt-3 p-4 bg-gray-50 border rounded-lg text-left text-xs space-y-1">
                <p><span className="font-medium">Downloads:</span> {downloads.length}</p>
                <p><span className="font-medium">File Filter:</span> {fileId || 'All files'}</p>
                <p><span className="font-medium">Status:</span> Component loaded ✓</p>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-8">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Download Analytics</h1>
                <p className="text-sm sm:text-base text-gray-600">Track how your shared files are being accessed</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Total Downloads */}
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{downloads.length}</div>
              <div className="text-xs sm:text-sm text-gray-500 font-medium">Total Downloads</div>
            </div>
            
            {/* Unique Files */}
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{Object.keys(groupedDownloads).length}</div>
              <div className="text-xs sm:text-sm text-gray-500 font-medium">Files Downloaded</div>
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={fetchDownloads}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-lg font-medium text-gray-700 hover:text-gray-900 transition-all shadow-sm hover:shadow text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/60 backdrop-blur rounded-lg p-3 sm:p-4 border border-white/50">
            <div className="flex items-center gap-2 mb-1">
              <Share className="w-4 h-4 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">Shared Downloads</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {downloads.filter(d => d.downloadType === 'shared').length}
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-3 sm:p-4 border border-white/50">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">Public Downloads</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {downloads.filter(d => d.downloadType === 'public').length}
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-3 sm:p-4 border border-white/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">Recent Activity</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-emerald-600">
              {downloads.length > 0 ? formatDate(Math.max(...downloads.map(d => new Date(d.downloadedAt).getTime())).toString()) : 'No activity'}
            </div>
          </div>
        </div>
      </div>

      {/* Files with Downloads */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          Download Activity by File
        </h2>
        
        {Object.entries(groupedDownloads)
          .sort(([,a], [,b]) => new Date(b.lastDownload).getTime() - new Date(a.lastDownload).getTime())
          .map(([fileId, fileData]) => {
            const isExpanded = expandedFiles.has(fileId);
            const recentDownloads = fileData.downloads
              .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
              .slice(0, 3);
            
            return (
              <div key={fileId} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* File Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                        {getFileIcon(fileData.file.mimeType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{fileData.file.originalName}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-500 mt-1">
                          <span>{formatBytes(fileData.file.size)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">{fileData.file.mimeType}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Last download {formatDate(fileData.lastDownload)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      {/* Download Stats */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-center">
                          <div className="text-xl sm:text-2xl font-bold text-gray-900">{fileData.totalDownloads}</div>
                          <div className="text-xs text-gray-500 font-medium">Downloads</div>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md">
                            <Share className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">{fileData.sharedDownloads}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-md">
                            <Globe className="w-3 h-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700">{fileData.publicDownloads}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expand Button */}
                      <button
                        onClick={() => toggleFileExpansion(fileId)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span className="hidden sm:inline">Hide Details</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span className="hidden sm:inline">View Details</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Downloads Preview (always visible) */}
                <div className="p-4 sm:p-6 bg-gray-50/50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {recentDownloads.map((download) => (
                      <div key={download.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-2 px-3 bg-white rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          {getDownloadTypeIcon(download.downloadType)}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-900 block truncate">
                              {download.downloadedUser?.email || 'Anonymous User'}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full w-fit">
                                {getDownloadTypeLabel(download.downloadType)}
                              </span>
                              <span className="text-xs text-gray-500 truncate">{download.ipAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">{formatDate(download.downloadedAt)}</div>
                          <div className="text-xs text-gray-500">{new Date(download.downloadedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {fileData.downloads.length > 3 && !isExpanded && (
                    <button 
                      onClick={() => toggleFileExpansion(fileId)}
                      className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all {fileData.downloads.length} downloads
                    </button>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-4 sm:p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">All Downloads ({fileData.downloads.length})</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {fileData.downloads
                          .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
                          .map((download) => (
                          <div key={download.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-3 px-3 sm:px-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              {getDownloadTypeIcon(download.downloadType)}
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-900 block truncate">
                                  {download.downloadedUser?.email || 'Anonymous User'}
                                </span>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                                  <span className="text-xs px-2 py-1 bg-white text-gray-600 rounded-full border w-fit">
                                    {getDownloadTypeLabel(download.downloadType)}
                                  </span>
                                  <span className="text-xs text-gray-500">IP: {download.ipAddress}</span>
                                  {download.userAgent && (
                                    <span className="text-xs text-gray-500 truncate">
                                      {download.userAgent.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              <div className="text-sm font-medium text-gray-900">{formatDate(download.downloadedAt)}</div>
                              <div className="text-xs text-gray-500">{new Date(download.downloadedAt).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}