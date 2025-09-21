"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GqlStarredFile, GqlStarredFolder, GqlUserFile, GqlFolder } from "./types";
import { QUERY_MY_STARRED_FILES, QUERY_MY_STARRED_FOLDERS, MUTATION_UNSTAR_FILE, MUTATION_UNSTAR_FOLDER } from "./graphql";
import { gqlFetch, getFileURL, trackFileActivity } from "./api";
import { Star, StarOff, File, Folder, Download, ExternalLink, Trash2, Share2, X } from "lucide-react";
import { formatFileSize, formatDate } from "@/lib/utils";
import ShareModal from "./ShareModal";

export default function Starred() {
  const [starredFiles, setStarredFiles] = useState<GqlStarredFile[]>([]);
  const [starredFolders, setStarredFolders] = useState<GqlStarredFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "files" | "folders">("all");
  const [preview, setPreview] = useState<{ open: boolean; url?: string; name?: string; mime?: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ open: boolean; itemType?: "file" | "folder"; itemId?: string; itemName?: string }>({ open: false });

  useEffect(() => {
    loadStarredItems();
  }, []);

  const loadStarredItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filesResponse = await gqlFetch<{ myStarredFiles: GqlStarredFile[] }>(QUERY_MY_STARRED_FILES, {});
      const foldersResponse = await gqlFetch<{ myStarredFolders: GqlStarredFolder[] }>(QUERY_MY_STARRED_FOLDERS, {});

      // Fix: gqlFetch returns json.data directly, not the whole response
      const files = filesResponse.myStarredFiles || [];
      const folders = foldersResponse.myStarredFolders || [];

      setStarredFiles(files);
      setStarredFolders(folders);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error loading starred items:", err);
      setError(error.message || "Failed to load starred items");
      toast.error("Failed to load starred items");
    } finally {
      setLoading(false);
    }
  };

  const handleUnstarFile = async (fileId: string) => {
    try {
      const response = await gqlFetch<{ unstarFile: { success: boolean }; errors?: Array<{ message: string }> }>(MUTATION_UNSTAR_FILE, { fileId });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      
      // Remove from local state
      setStarredFiles(prev => prev.filter(sf => sf.file.id !== fileId));
      toast.success("File unstarred");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error unstarring file:", err);
      toast.error(error.message || "Failed to unstar file");
    }
  };

  const handleUnstarFolder = async (folderId: string) => {
    try {
      const response = await gqlFetch<{ unstarFolder: { success: boolean }; errors?: Array<{ message: string }> }>(MUTATION_UNSTAR_FOLDER, { folderId });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      
      // Remove from local state
      setStarredFolders(prev => prev.filter(sf => sf.folder.id !== folderId));
      toast.success("Folder unstarred");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error unstarring folder:", err);
      toast.error(error.message || "Failed to unstar folder");
    }
  };

  const handlePreview = async (file: GqlStarredFile["file"]) => {
    try {
      const url = await getFileURL(file.id, true);
      setPreview({ open: true, url, name: file.originalName, mime: file.mimeType });
      trackFileActivity(file.id, 'preview');
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error getting file URL:", err);
      toast.error("Failed to preview file");
    }
  };

  const handleDownload = async (file: GqlStarredFile["file"]) => {
    try {
      const url = await getFileURL(file.id, false);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      trackFileActivity(file.id, 'download');
      toast.success("Download started");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error downloading file:", err);
      toast.error("Failed to download file");
    }
  };

  const filteredFiles = activeTab === "folders" ? [] : starredFiles;
  const filteredFolders = activeTab === "files" ? [] : starredFolders;

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center space-x-2 mb-6">
          <Star className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">Starred</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center space-x-2 mb-6">
          <Star className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">Starred</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadStarredItems}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasItems = starredFiles.length > 0 || starredFolders.length > 0;

  console.log("DEBUG: Render state:", {
    starredFiles,
    starredFolders,
    starredFilesLength: starredFiles.length,
    starredFoldersLength: starredFolders.length,
    hasItems,
    loading,
    error,
    activeTab
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Star className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">Starred</h1>
        </div>
        
        {hasItems && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All ({starredFiles.length + starredFolders.length})
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === "files" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Files ({starredFiles.length})
            </button>
            <button
              onClick={() => setActiveTab("folders")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === "folders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Folders ({starredFolders.length})
            </button>
          </div>
        )}
      </div>

      {!hasItems ? (
        <div>
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No starred items</h3>
            <p className="text-gray-500">Star files and folders to quickly access them here</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Render Folders */}
          {filteredFolders.map(starredFolder => (
            <div key={starredFolder.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{starredFolder.folder.name}</span>
                  </div>
                  <button
                    onClick={() => handleUnstarFolder(starredFolder.folder.id)}
                    className="p-1 text-yellow-500 hover:text-gray-500 flex-shrink-0"
                    title="Unstar folder"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>Starred {formatDate(starredFolder.starredAt)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShareModal({ open: true, itemType: "folder", itemId: starredFolder.folder.id, itemName: starredFolder.folder.name })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Share folder"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Render Files */}
          {filteredFiles.map(starredFile => (
            <div key={starredFile.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{starredFile.file.originalName}</span>
                  </div>
                  <button
                    onClick={() => handleUnstarFile(starredFile.file.id)}
                    className="p-1 text-yellow-500 hover:text-gray-500 flex-shrink-0"
                    title="Unstar file"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>{formatFileSize(starredFile.file.size)}</span>
                  <span>Starred {formatDate(starredFile.starredAt)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {starredFile.file.mimeType.startsWith('image/') && (
                    <button
                      onClick={() => handlePreview(starredFile.file)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Preview"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(starredFile.file)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShareModal({ open: true, itemType: "file", itemId: starredFile.file.id, itemName: starredFile.file.originalName })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Share file"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview?.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h3 className="font-medium truncate pr-2 text-sm sm:text-base">{preview.name}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4">
              {preview.url && (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain mx-auto" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModal.open && (
        <ShareModal
          isOpen={shareModal.open}
          onClose={() => setShareModal({ open: false })}
          itemType={shareModal.itemType!}
          itemId={shareModal.itemId!}
          itemName={shareModal.itemName!}
        />
      )}
    </div>
  );
}