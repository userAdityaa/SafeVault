"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GRAPHQL_ENDPOINT } from "@/lib/backend";
import { getRecentFileActivities, trackFileActivity, getFileURL } from "./api";
import { MUTATION_UPLOAD_FOLDER } from "./graphql";

/**
 * Represents a recently accessed file with activity tracking information.
 */
interface RecentFile {
  /** Unique identifier for the file activity record */
  id: string;
  /** The file ID being tracked */
  fileId: string;
  /** Type of activity performed on the file */
  activityType: string;
  /** Most recent type of activity */
  lastActivityType: string;
  /** Timestamp of the last activity */
  lastActivityAt: string;
  /** Total number of activities on this file */
  activityCount: number;
  /** File metadata information */
  file: {
    /** Unique file identifier */
    id: string;
    /** Original filename as uploaded */
    originalName: string;
    /** MIME type of the file */
    mimeType: string;
    /** File size in bytes */
    size: number;
    /** File creation timestamp */
    createdAt: string;
  };
}

/**
 * Response structure for GraphQL upload mutation.
 */
interface GraphQLUploadResponse {
  /** Successful response data */
  data?: {
    /** Array of uploaded file records */
    uploadFiles?: Array<{
      /** Upload record ID */
      id: string;
      /** User who uploaded the file */
      userId: string;
      /** Associated file ID */
      fileId: string;
      /** Upload timestamp */
      uploadedAt: string;
      /** File metadata */
      file: {
        /** Unique file identifier */
        id: string;
        /** File content hash */
        hash: string;
        /** Original filename */
        originalName: string;
        /** MIME type */
        mimeType: string;
        /** File size in bytes */
        size: number;
        /** File visibility setting */
        visibility: string;
        /** Creation timestamp */
        createdAt: string;
      };
    }>;
  };
  /** Error information if upload failed */
  errors?: Array<{ message: string }>;
}

/**
 * GraphQL operation structure for file uploads.
 */
interface UploadOperations {
  /** GraphQL mutation query string */
  query: string;
  /** Variables for the GraphQL mutation */
  variables: {
    /** Input parameters for file upload */
    input: {
      /** Array of files to upload (null placeholders for multipart) */
      files: (File | null)[];
      /** Whether to allow duplicate file uploads */
      allowDuplicate?: boolean;
    };
  };
}

/**
 * Represents an individual file upload item with progress tracking.
 */
type UploadItem = {
  /** Unique identifier for this upload */
  id: string;
  /** The file being uploaded */
  file: File;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current upload status */
  status: "queued" | "uploading" | "done" | "error";
  /** Error message if upload failed */
  error?: string;
  /** Whether this item is being removed from the queue */
  removing?: boolean; 
  /** Type of upload - file or folder */
  type?: "file" | "folder";
  /** For folder uploads - number of files contained */
  fileCount?: number;
  /** For folder uploads - folder name */
  folderName?: string;
};

/**
 * Uploads a file to the GraphQL endpoint using multipart form data.
 * 
 * @param file - The file to upload
 * @param token - Optional authentication token
 * @param onProgress - Optional callback to track upload progress (percentage 0-100)
 * @param allowDuplicate - Whether to allow duplicate file uploads
 * @returns Promise that resolves to the GraphQL upload response
 * 
 * @example
 * ```typescript
 * const response = await graphqlUpload(
 *   selectedFile, 
 *   authToken, 
 *   (progress) => console.log(`${progress}% complete`),
 *   true
 * );
 * ```
 */
const graphqlUpload = (file: File, token?: string, onProgress?: (pct: number) => void, allowDuplicate?: boolean) => {
  return new Promise<GraphQLUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", GRAPHQL_ENDPOINT);
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (xhr.upload) {
      xhr.upload.addEventListener("loadstart", () => onProgress && onProgress(1));
      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress && onProgress(Math.min(99, Math.max(1, pct)));
      });
      xhr.upload.addEventListener("load", () => onProgress && onProgress(100));
    }

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        resolve(json);
      } catch (e) {
        reject(new Error("Invalid JSON response"));
      }
    };

    const mutation = `mutation UploadFiles($input: UploadFileInput!) {\n  uploadFiles(input: $input) {\n    id\n    userId\n    fileId\n    uploadedAt\n    file { id hash originalName mimeType size visibility createdAt }\n  }\n}`;

      const operations: UploadOperations = {
        query: mutation,
        variables: { input: { files: [null] } },
      };
      if (allowDuplicate) {
        operations.variables.input.allowDuplicate = true;
      }
    const map = { "0": ["variables.input.files.0"] } as Record<string, string[]>;

    const form = new FormData();
    form.append("operations", JSON.stringify(operations));
    form.append("map", JSON.stringify(map));
    form.append("0", file, file.name);

    xhr.send(form);
  });
};

/**
 * Home component that provides file upload functionality with drag & drop support,
 * progress tracking, and recent file activity display.
 * 
 * Features:
 * - Drag and drop file upload
 * - Multiple file upload with progress tracking
 * - Duplicate file handling
 * - Recent file activity display
 * - File preview functionality
 * 
 * @component
 * @example
 * ```tsx
 * <Home />
 * ```
 */
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dupModal, setDupModal] = useState<{ open: boolean; current?: { item: UploadItem; matchName: string; hash: string } } | null>(null);
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set());
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(false);

  // Load recent file activities
  const loadRecentFiles = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('token')) return;
    
    console.log('Loading recent files...');
    setRecentFilesLoading(true);
    try {
      const activities = await getRecentFileActivities(10);
      console.log('Recent files loaded:', activities);
      setRecentFiles(activities);
    } catch (error) {
      console.error('Failed to load recent files:', error);
    } finally {
      setRecentFilesLoading(false);
    }
  }, []);

  // Load recent files on mount and when files are updated
  useEffect(() => {
    loadRecentFiles();
    
    const handleFilesUpdated = () => {
      loadRecentFiles();
    };
    
    window.addEventListener('files:updated', handleFilesUpdated);
    return () => window.removeEventListener('files:updated', handleFilesUpdated);
  }, [loadRecentFiles]);

  // Handle preview for recent files
  const handleRecentFilePreview = useCallback(async (file: RecentFile['file']) => {
    try {
      await trackFileActivity(file.id, 'preview');
      const url = await getFileURL(file.id, true);
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Failed to preview file");
    }
  }, []);

  // Handle download for recent files  
  const handleRecentFileDownload = useCallback(async (file: RecentFile['file']) => {
    try {
      await trackFileActivity(file.id, 'download');
      const url = await getFileURL(file.id, false);
      window.location.href = url;
    } catch (error) {
      toast.error("Failed to download file");
    }
  }, []);

  // Function to remove upload item with animation
  const removeUploadItem = useCallback((itemId: string) => {
    // First, mark the item as removing (for animation)
    setUploads((prev) => prev.map((u) => (u.id === itemId ? { ...u, removing: true } : u)));
    
    // After animation duration, actually remove the item
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.id !== itemId));
      setNewlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300); // 300ms animation duration
  }, []);

  const sha256 = async (file: File) => {
    const buf = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const startUploads = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;

    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      progress: 0,
      status: "queued",
      removing: false,
    }));
    setUploads((prev) => [...newItems, ...prev]);
    
    // Mark new items as newly added for entrance animation
    const newIds = new Set(newItems.map(item => item.id));
    setNewlyAdded(newIds);
    
    // Remove the newly added flag after entrance animation completes
    setTimeout(() => {
      setNewlyAdded(new Set());
    }, 300);

    for (const item of newItems) {
      let allowDup = false;
      try {
        const hash = await sha256(item.file);
        const query = `query Find($hash: String!) { findMyFileByHash(hash: $hash) { id file { originalName } } }`;
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query, variables: { hash } }),
        });
        const json = await res.json();
        const match = json?.data?.findMyFileByHash;
        if (match) {
          // open modal and wait for user choice
          await new Promise<void>((resolve) => {
            setDupModal({ open: true, current: { item, matchName: match.file.originalName, hash } });
            const handler = (e: Event) => {
              const customEvent = e as CustomEvent<{ action: string; hash: string; id: string }>;
              if (customEvent.detail?.action === "continue" && customEvent.detail?.hash === hash && customEvent.detail?.id === item.id) {
                window.removeEventListener("dup:response", handler);
                allowDup = true;
                resolve();
              } else if (customEvent.detail?.action === "skip" && customEvent.detail?.hash === hash && customEvent.detail?.id === item.id) {
                window.removeEventListener("dup:response", handler);
                // Mark skipped by showing toast and removing with animation
                toast.info(`Skipped ${item.file.name}`);
                setTimeout(() => removeUploadItem(item.id), 1000);
                // do not upload
                throw new Error("skip");
              }
            };
            window.addEventListener("dup:response", handler);
          });
          setDupModal({ open: false });
        }
      } catch (e: unknown) {
        const error = e as Error;
        if (error?.message === "skip") continue;
      }

      setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "uploading", progress: 1 } : u)));

      graphqlUpload(
        item.file,
        token,
        (pct: number) => setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u))),
        allowDup
      )
        .then((res) => {
          if (res.errors) {
            const message = String(res.errors[0]?.message || "Upload failed");
            setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "error", error: message } : u)));
            toast.error(message);
            // Remove with animation after showing error for 2 seconds
            setTimeout(() => removeUploadItem(item.id), 2000);
            return;
          }
          setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "done", progress: 100 } : u)));
          toast.success(`${item.file.name} has been uploaded`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("files:updated"));
          }
          // Remove with animation after showing success for 1.5 seconds
          setTimeout(() => removeUploadItem(item.id), 1500);
        })
        .catch((err) => {
          if (err?.message === "skip") return;
          setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "error", error: err.message } : u)));
          toast.error(err.message || "Upload error");
          // Remove with animation after showing error for 2 seconds
          setTimeout(() => removeUploadItem(item.id), 2000);
        });
    }

    // Reset the input to allow re-selecting the same files
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  // Handle folder selection from file input
  const handleFolderSelect = async (files: FileList | null) => {
    console.log('=== FOLDER UPLOAD DEBUG ===');
    console.log('Raw files from input:', files);
    
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log('Files count:', files.length);
    
    // Log all files with their properties
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`File ${i}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        webkitRelativePath: file.webkitRelativePath,
        lastModified: file.lastModified
      });
    }
    
    // Convert FileList to array and filter out system files
    const fileArray = Array.from(files).filter(file => 
      !file.name.startsWith('.') && // Filter out hidden files like .DS_Store
      file.name !== 'Thumbs.db' && // Filter out Windows thumbnail cache
      file.size > 0 // Filter out empty files
    );
    
    console.log('Filtered files count:', fileArray.length);
    console.log('Filtered files:', fileArray.map(f => ({ name: f.name, path: f.webkitRelativePath })));
    
    if (fileArray.length === 0) {
      toast.error('No valid files found in the selected folder');
      return;
    }
    
    const folderName = fileArray[0]?.webkitRelativePath?.split('/')[0] || 'Untitled Folder';
    console.log('Extracted folder name:', folderName);
    console.log('=== END FOLDER UPLOAD DEBUG ===');
    
    await uploadFolder(fileArray, folderName);
  };

  // Handle directory upload from drag and drop
  const handleDirectoryUpload = async (items: DataTransferItemList) => {
    const filePromises: Promise<File[]>[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry?.isDirectory) {
          console.log('Processing directory:', entry.name);
          filePromises.push(traverseDirectory(entry as FileSystemDirectoryEntry));
        }
      }
    }
    
    const allFiles = (await Promise.all(filePromises)).flat()
      .filter(file => 
        !file.name.startsWith('.') && // Filter out hidden files like .DS_Store
        file.name !== 'Thumbs.db' && // Filter out Windows thumbnail cache
        file.size > 0 // Filter out empty files
      );
      
    console.log('All files from drag and drop:', allFiles.length, allFiles.map(f => ({ name: f.name, path: f.webkitRelativePath })));
      
    if (allFiles.length === 0) {
      toast.error('No valid files found in the dropped folder');
      return;
    }
    
    // Get folder name from the first file's path or use a default
    const folderName = allFiles[0]?.webkitRelativePath?.split('/')[0] || 'Untitled Folder';
    console.log('Extracted folder name:', folderName);
    await uploadFolder(allFiles, folderName);
  };

  // Recursively traverse directory entries
  const traverseDirectory = async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    
    return new Promise((resolve) => {
      const reader = entry.createReader();
      
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }
          
          for (const entry of entries) {
            if (entry.isFile) {
              const file = await new Promise<File>((resolve) => {
                (entry as FileSystemFileEntry).file(resolve);
              });
              // Ensure the file has the correct relative path
              Object.defineProperty(file, 'webkitRelativePath', {
                value: entry.fullPath.substring(1), // Remove leading slash
                writable: false
              });
              console.log('File from directory traversal:', file.name, 'Path:', file.webkitRelativePath);
              files.push(file);
            } else if (entry.isDirectory) {
              const subFiles = await traverseDirectory(entry as FileSystemDirectoryEntry);
              files.push(...subFiles);
            }
          }
          
          readEntries(); // Continue reading if there are more entries
        });
      };
      
      readEntries();
    });
  };

  // Upload folder with GraphQL mutation
  const uploadFolder = async (files: File[], folderName: string) => {
    if (!files.length) return;

    console.log('Starting folder upload:', { folderName, fileCount: files.length });

    // Filter out system files first
    const validFiles = files.filter(file => !file.name.startsWith('.') && file.name !== 'Thumbs.db');
    
    console.log(`Processing ${validFiles.length} valid files out of ${files.length} total files`);

    // Create a folder upload item for progress tracking
    const folderId = Date.now().toString();
    const folderUploadItem: UploadItem = {
      id: folderId,
      file: new File([], folderName), // Dummy file object for display
      progress: 0,
      status: "uploading",
      type: "folder",
      fileCount: validFiles.length,
      folderName: folderName
    };

    // Add folder upload to uploads list
    setUploads(prev => [...prev, folderUploadItem]);
    setNewlyAdded(prev => new Set(prev).add(folderId));

    const formData = new FormData();
    
    // Prepare file inputs with relative paths
    const fileInputs = validFiles.map((file, index) => ({
      relativePath: file.webkitRelativePath || `${folderName}/${file.name}`
    }));

    console.log('File inputs prepared:', fileInputs);
    
    const operations = {
      query: MUTATION_UPLOAD_FOLDER,
      variables: {
        input: {
          folderName,
          files: fileInputs,
          allowDuplicate: false
        }
      }
    };
    
    // Create map for multipart upload - this maps form data fields to GraphQL variables
    const map: Record<string, string[]> = {};
    validFiles.forEach((_, index) => {
      map[index.toString()] = [`variables.input.files.${index}.file`];
    });

    console.log('Upload map:', map);
    
    // Build FormData
    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify(map));
    
    // Append actual files with their index as the key
    validFiles.forEach((file, index) => {
      console.log(`Appending file ${index}:`, file.name, 'Path:', file.webkitRelativePath);
      formData.append(index.toString(), file);
    });
    
    try {
      // Simulate progress updates
      setUploads(prev => prev.map(u => u.id === folderId ? { ...u, progress: 25 } : u));

      const token = localStorage.getItem('token');
      const response = await fetch(`${GRAPHQL_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      setUploads(prev => prev.map(u => u.id === folderId ? { ...u, progress: 75 } : u));
      
      const result = await response.json();
      
      console.log('Upload response:', result);
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        setUploads(prev => prev.map(u => u.id === folderId ? { 
          ...u, 
          status: "error", 
          error: result.errors[0]?.message || 'Upload failed'
        } : u));
        setTimeout(() => removeUploadItem(folderId), 3000);
        throw new Error(result.errors[0]?.message || 'Upload failed');
      }
      
      if (!result.data || !result.data.uploadFolder) {
        console.error('Invalid response structure:', result);
        setUploads(prev => prev.map(u => u.id === folderId ? { 
          ...u, 
          status: "error", 
          error: 'Invalid response from server'
        } : u));
        setTimeout(() => removeUploadItem(folderId), 3000);
        throw new Error('Invalid response from server');
      }
      
      const { folder, files: uploadedFiles, summary } = result.data.uploadFolder;
      
      console.log('Upload successful:', { folder, uploadedFiles, summary });
      
      // Mark upload as complete
      setUploads(prev => prev.map(u => u.id === folderId ? { 
        ...u, 
        progress: 100,
        status: "done"
      } : u));
      
      toast.success(`Folder "${folder.name}" uploaded successfully! ${summary.totalFiles} files in ${summary.totalFolders} folders.`);
      
      // Remove the upload item after a delay
      setTimeout(() => removeUploadItem(folderId), 2000);
      
      // Trigger refresh of file listings
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("files:updated"));
      }
      
    } catch (error) {
      console.error('Folder upload error:', error);
      setUploads(prev => prev.map(u => u.id === folderId ? { 
        ...u, 
        status: "error", 
        error: error instanceof Error ? error.message : 'Failed to upload folder'
      } : u));
      setTimeout(() => removeUploadItem(folderId), 3000);
      toast.error(error instanceof Error ? error.message : 'Failed to upload folder');
    }
  };

  return (
    <div className="px-8 py-4">
      {/* Uploads List */}
      {uploads.length > 0 && (
        <div className="mt-4 mb-6 space-y-3">
          {uploads.map((u) => (
            <div 
              key={u.id} 
              className={`bg-white border rounded-lg p-3 shadow-sm transition-all duration-300 ease-in-out ${
                u.removing 
                  ? 'opacity-0 transform translate-x-full scale-95' 
                  : newlyAdded.has(u.id)
                  ? 'opacity-100 transform translate-x-0 scale-100 animate-slideInLeft'
                  : 'opacity-100 transform translate-x-0 scale-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.file.name}</p>
                  <p className="text-xs text-gray-500">{(u.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <div className="text-xs font-medium flex items-center gap-2">
                  {u.status === "uploading" && <span className="text-blue-600">{u.progress}%</span>}
                  {u.status === "done" && (
                    <div className="flex items-center gap-1">
                      <span className="text-green-600">✓ Done</span>
                    </div>
                  )}
                  {u.status === "error" && (
                    <div className="flex items-center gap-1">
                      <span className="text-red-600">✗ Error</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-200 ${
                    u.status === "error" ? "bg-red-500" : u.status === "done" ? "bg-green-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              {u.status === "error" && u.error && (
                <p className="text-xs text-red-600 mt-1">{u.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File Folders Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        {/* Add New / Drag & Drop */}
        <div
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const items = e.dataTransfer.items;
            if (items) {
              // Check if any item is a directory
              const hasDirectories = Array.from(items).some(item => item.webkitGetAsEntry()?.isDirectory);
              if (hasDirectories) {
                await handleDirectoryUpload(items);
              } else {
                const files = e.dataTransfer.files;
                await startUploads(files);
              }
            } else {
              const files = e.dataTransfer.files;
              await startUploads(files);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
          }}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${dragOver ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-500 hover:text-blue-600"}`}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-2xl mb-3">+</div>
          <p className="font-medium text-gray-600">Add New or Drag & Drop</p>
          <p className="text-xs text-gray-500 mt-1">Drop files or folders here to upload</p>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Files
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Upload Folder
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => startUploads(e.target.files)} />
        <input 
          ref={folderInputRef} 
          type="file" 
          {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement> & { webkitdirectory: string })} 
          multiple 
          className="hidden" 
          onChange={(e) => handleFolderSelect(e.target.files)} 
        />
      </section>

      {/* Duplicate Modal */}
      {dupModal?.open && dupModal.current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Duplicate file detected</h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              <span className="font-medium break-words">{dupModal.current.item.file.name}</span> content matches with
              <span className="font-medium break-words"> {dupModal.current.matchName}</span>. Do you still want to upload it?
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm order-2 sm:order-1"
                onClick={() => {
                  setDupModal({ open: false });
                  window.dispatchEvent(new CustomEvent("dup:response", { detail: { action: "skip", hash: dupModal.current!.hash, id: dupModal.current!.item.id } }));
                }}
              >
                Skip
              </button>
              <button
                className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm order-1 sm:order-2"
                onClick={() => {
                  setDupModal({ open: false });
                  window.dispatchEvent(new CustomEvent("dup:response", { detail: { action: "continue", hash: dupModal.current!.hash, id: dupModal.current!.item.id } }));
                }}
              >
                Continue Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Files Section */}
      <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-blue-600">Recently Accessed Files</h3>
          {recentFiles.length > 0 && (
            <button
              onClick={loadRecentFiles}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors self-start sm:self-auto"
            >
              Refresh
            </button>
          )}
        </div>
        
        {recentFilesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3 sm:w-1/4"></div>
                </div>
                <div className="hidden sm:block h-4 bg-gray-200 rounded w-20"></div>
                <div className="hidden sm:block h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No recent file activity</p>
            <p className="text-gray-400 text-xs mt-1">Files you preview or download will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentFiles.map((activity) => {
              const file = activity.file;
              const isImage = file.mimeType?.startsWith('image/');
              const isPdf = file.mimeType === 'application/pdf';
              const formatFileSize = (size: number) => {
                if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                return `${(size / (1024 * 1024)).toFixed(1)} MB`;
              };
              const timeAgo = (dateString: string) => {
                const date = new Date(dateString);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
                
                if (diffDays > 0) return `${diffDays}d ago`;
                if (diffHours > 0) return `${diffHours}h ago`;
                const diffMins = Math.floor(diffMs / (1000 * 60));
                if (diffMins > 0) return `${diffMins}m ago`;
                return 'Just now';
              };

              return (
                <div key={activity.fileId} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                  {/* Top row on mobile: Icon + File name + Actions */}
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    {/* File Icon */}
                    <div className="w-8 h-8 flex-shrink-0">
                    {isImage ? (
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : isPdf ? (
                      <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* File name - takes remaining space */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.originalName}</p>
                  </div>
                  
                  {/* Action Buttons - always visible on mobile, hover on desktop */}
                  <div className="flex space-x-1 sm:space-x-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => handleRecentFilePreview(file)}
                      className="px-2 sm:px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleRecentFileDownload(file)}
                      className="px-2 sm:px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Download
                    </button>
                  </div>
                  </div>
                  
                  {/* Bottom row on mobile: File details */}
                  <div className="sm:hidden pl-11">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{activity.lastActivityType}</span>
                      <span>•</span>
                      <span>{timeAgo(activity.lastActivityAt)}</span>
                      {activity.activityCount > 1 && (
                        <>
                          <span>•</span>
                          <span>{activity.activityCount} times</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desktop layout: File info inline */}
                  <div className="hidden sm:block flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="capitalize">{activity.lastActivityType}</span>
                      <span>•</span>
                      <span>{timeAgo(activity.lastActivityAt)}</span>
                      {activity.activityCount > 1 && (
                        <>
                          <span>•</span>
                          <span>{activity.activityCount} times</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
