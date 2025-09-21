"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, Download, ExternalLink, ArrowLeft } from "lucide-react";
import { PreviewModal } from "./my-files/modals";
import { gqlFetch } from "./api";
import { QUERY_FILE_URL, QUERY_SHARED_FOLDER_FILES } from "./graphql";

interface SharedContentResponse {
  sharedFilesWithMe: SharedFile[];
  sharedFoldersWithMe: SharedFolder[];
}

type GqlUserFile = {
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
};

// Moved to a constant here; could be exported if needed elsewhere
const QUERY_SHARED_CONTENT = `query SharedContent {
  sharedFilesWithMe {
    id fileId ownerId sharedWithEmail permission sharedAt
    file { id hash originalName mimeType size visibility createdAt }
    owner { email name picture }
  }
  sharedFoldersWithMe {
    id folderId ownerId sharedWithEmail permission sharedAt
    folder { id name parentId createdAt }
    owner { email name picture }
  }
}`;

type SharedFile = {
  id: string;
  fileId: string;
  ownerId: string;
  sharedWithEmail: string;
  permission: string;
  sharedAt: string;
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
    email: string;
    name?: string;
    picture?: string;
  };
};

type SharedFolder = {
  id: string;
  folderId: string;
  ownerId: string;
  sharedWithEmail: string;
  permission: string;
  sharedAt: string;
  folder: {
    id: string;
    name: string;
    parentId?: string;
    createdAt: string;
  };
  owner: {
    email: string;
    name?: string;
    picture?: string;
  };
};

export default function SharedFiles() {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; url?: string; name?: string; mime?: string } | null>(null);
  
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<GqlUserFile[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);

  const fetchSharedContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gqlFetch<SharedContentResponse>(QUERY_SHARED_CONTENT);
      setSharedFiles(data.sharedFilesWithMe || []);
      setSharedFolders(data.sharedFoldersWithMe || []);
    } catch (e: unknown) {
      const error = e as Error;
      const msg = error.message || "Failed to fetch shared content";
      // Normalize common auth/network messages for user clarity
      const userMsg = /unauthorized|401/i.test(msg)
        ? "You are not authorized. Please log in again."
        : /fetch failed|network/i.test(msg)
          ? "Network error contacting server. Ensure backend is running."
          : msg;
      setError(userMsg);
      toast.error(userMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedContent();
  }, []);

  const fetchSharedFolderFiles = async (folderId: string) => {
    setFolderLoading(true);
    try {
      const data = await gqlFetch<{ sharedFolderFiles: GqlUserFile[] }>(QUERY_SHARED_FOLDER_FILES, { folderId });
      setFolderFiles(data.sharedFolderFiles || []);
    } catch (e: unknown) {
      const error = e as Error;
      const msg = error.message || "Failed to fetch folder files";
      toast.error(msg);
      setFolderFiles([]);
    } finally {
      setFolderLoading(false);
    }
  };

  const handleOpenFolder = async (folder: SharedFolder) => {
    setCurrentFolderId(folder.folderId);
    setCurrentFolderName(folder.folder.name);
    await fetchSharedFolderFiles(folder.folderId);
  };

  const handleBackToShared = () => {
    setCurrentFolderId(null);
    setCurrentFolderName(null);
    setFolderFiles([]);
  };

  const getFileURL = async (fileId: string, inline: boolean): Promise<string> => {
    const data = await gqlFetch<{ fileURL: string }>(QUERY_FILE_URL, { fileId, inline });
    return data.fileURL;
  };

  const handlePreview = async (file: SharedFile) => {
    try {
      const url = await getFileURL(file.fileId, true);
      setPreview({ open: true, url, name: file.file.originalName, mime: file.file.mimeType });
    } catch (error) {
      // Fallback to external link
      const url = await getFileURL(file.fileId, true);
      window.open(url, "_blank");
    }
  };

  const handleDownload = async (file: SharedFile) => {
    try {
      const url = await getFileURL(file.fileId, false);
      window.location.href = url;
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Download failed");
    }
  };

  const handleFolderFilePreview = async (file: GqlUserFile) => {
    try {
      const url = await getFileURL(file.fileId, true);
      setPreview({ open: true, url, name: file.file.originalName, mime: file.file.mimeType });
    } catch (error) {
      // Fallback to external link
      const url = await getFileURL(file.fileId, true);
      window.open(url, "_blank");
    }
  };

  const handleFolderFileDownload = async (file: GqlUserFile) => {
    try {
      const url = await getFileURL(file.fileId, false);
      window.location.href = url;
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Download failed");
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const renderPreview = (url: string, mime?: string) => {
    if (mime?.startsWith("image/")) {
      return <img src={url} alt="Preview" className="max-w-full max-h-96 object-contain" />;
    } else if (mime?.startsWith("video/")) {
      return <video src={url} controls className="max-w-full max-h-96" />;
    } else if (mime?.startsWith("audio/")) {
      return <audio src={url} controls className="w-full" />;
    } else if (mime === "application/pdf") {
      return <iframe src={url} className="w-full h-96" title="PDF Preview" />;
    } else {
      return (
        <div className="flex flex-col items-center p-8">
          <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Open in new tab
          </a>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Shared Content</h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Shared Content</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSharedContent}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {currentFolderId && (
            <button 
              onClick={handleBackToShared}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Shared
            </button>
          )}
          <h2 className="text-xl font-semibold text-gray-900">
            {currentFolderId ? `Folder: ${currentFolderName}` : "Shared Content"}
          </h2>
        </div>
        {!currentFolderId && (
          <button onClick={fetchSharedContent} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md">Refresh</button>
        )}
      </div>

      {/* Show folder contents if viewing a folder */}
      {currentFolderId ? (
        <div>
          {folderLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : folderFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folderFiles.map((file) => (
                <div key={file.id} className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src="/files.svg" alt="file icon" width={32} height={32} className="opacity-80" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 truncate" title={file.file.originalName}>
                        {file.file.originalName.length > 25 
                          ? file.file.originalName.slice(0, 25) + "..." 
                          : file.file.originalName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatFileSize(file.file.size)} • {file.uploader?.name || file.uploader?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFolderFilePreview(file)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleFolderFileDownload(file)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Image src="/files.svg" alt="files icon" width={64} height={64} className="mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files in this folder</h3>
              <p className="text-gray-500">This shared folder is empty.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Shared Folders */}
          {sharedFolders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Shared Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedFolders.map((shared) => (
                  <div key={shared.id} className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition">
                    <div className="flex items-center gap-3 mb-3">
                      <Image src="/folder.svg" alt="folder icon" width={32} height={32} className="opacity-80" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{shared.folder.name}</div>
                        <div className="text-xs text-gray-400">
                          Shared by {shared.owner.name || shared.owner.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {shared.permission}
                      </span>
                      <span>Shared {formatDate(shared.sharedAt)}</span>
                    </div>
                    <button 
                      onClick={() => handleOpenFolder(shared)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Folder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Files */}
          {sharedFiles.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Shared Files</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedFiles.map((shared) => (
                  <div key={shared.id} className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition">
                    <div className="flex items-center gap-3 mb-3">
                      <Image src="/files.svg" alt="file icon" width={32} height={32} className="opacity-80" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 truncate" title={shared.file.originalName}>
                          {shared.file.originalName.length > 25 
                            ? shared.file.originalName.slice(0, 25) + "..." 
                            : shared.file.originalName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatFileSize(shared.file.size)} • Shared by {shared.owner.name || shared.owner.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {shared.permission}
                      </span>
                      <span>Shared {formatDate(shared.sharedAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreview(shared)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownload(shared)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {sharedFiles.length === 0 && sharedFolders.length === 0 && (
            <div className="text-center py-12">
              <Image src="/shared.svg" alt="shared icon" width={64} height={64} className="mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared content</h3>
              <p className="text-gray-500">
                Files and folders shared with you will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      <PreviewModal
        open={Boolean(preview?.open && preview.url)}
        name={preview?.name}
        url={preview?.url}
        mime={preview?.mime}
        onClose={() => setPreview({ open: false })}
      />
    </div>
  );
}