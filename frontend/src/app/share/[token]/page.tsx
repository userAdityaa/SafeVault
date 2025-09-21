"use client";
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gqlFetch } from '../../components/api';
import { QUERY_RESOLVE_PUBLIC_FILE_LINK, MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE, QUERY_FILE_URL } from '../../components/graphql';
import { toast } from 'sonner';
import Image from 'next/image';
import { Eye, Download, ArrowLeft, FolderOpen } from 'lucide-react';

interface ResolvedFileData {
  token: string;
  revoked: boolean;
  expiresAt?: string | null;
  file: { id: string; originalName: string; mimeType: string; size: number; createdAt: string; hash: string; visibility: string; refCount: number };
  owner: { id: string; email: string };
}

interface ResolvedFolderData {
  token: string;
  revoked: boolean;
  expiresAt?: string | null;
  folder: { id: string; name: string; parentId?: string; createdAt: string };
  owner: { id: string; email: string };
}

interface FolderFile {
  id: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  };
  uploadedAt: string;
}

const QUERY_RESOLVE_PUBLIC_FOLDER_LINK = `
  query ResolvePublicFolderLink($token: String!) {
    resolvePublicFolderLink(token: $token) {
      token revoked expiresAt
      folder { id name parentId createdAt }
      owner { id email }
    }
  }
`;

const QUERY_PUBLIC_FOLDER_FILES = `
  query PublicFolderFiles($token: String!) {
    publicFolderFiles(token: $token) {
      id userId fileId uploadedAt
      file { id hash originalName mimeType size refCount visibility createdAt }
      uploader { email name picture }
    }
  }
`;

export default function PublicSharePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState<ResolvedFileData | null>(null);
  const [folderData, setFolderData] = useState<ResolvedFolderData | null>(null);
  const [folderFiles, setFolderFiles] = useState<FolderFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [type, setType] = useState<'file' | 'folder' | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    
    try {
      // First try to resolve as a file link
      try {
        const fileResp = await gqlFetch<{ resolvePublicFileLink: ResolvedFileData | null }>(QUERY_RESOLVE_PUBLIC_FILE_LINK, { token });
        if (fileResp.resolvePublicFileLink && !fileResp.resolvePublicFileLink.revoked) {
          setFileData(fileResp.resolvePublicFileLink);
          setType('file');
          setLoading(false);
          return;
        }
      } catch (e) {
        // Not a file link, try folder
      }

      // Try to resolve as a folder link
      try {
        const folderResp = await gqlFetch<{ resolvePublicFolderLink: ResolvedFolderData | null }>(QUERY_RESOLVE_PUBLIC_FOLDER_LINK, { token });
        if (folderResp.resolvePublicFolderLink && !folderResp.resolvePublicFolderLink.revoked) {
          setFolderData(folderResp.resolvePublicFolderLink);
          setType('folder');
          
          // Load folder files
          const filesResp = await gqlFetch<{ publicFolderFiles: FolderFile[] }>(QUERY_PUBLIC_FOLDER_FILES, { token });
          setFolderFiles(filesResp.publicFolderFiles || []);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Not a folder link either
      }

      setError('Link not found or has been revoked');
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || 'Failed to resolve link');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB','MB','GB','TB'];
    let v = bytes / 1024; let i = 0;
    while (v >= 1024 && i < units.length-1) { v /= 1024; i++; }
    return `${v.toFixed(1)} ${units[i]}`;
  };

  const handleAdd = async () => {
    if (!token || !fileData) return;
    setAdding(true);
    try {
      await gqlFetch(MUTATION_ADD_PUBLIC_FILE_TO_MY_STORAGE, { token });
      toast.success('Added to your storage');
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || 'Failed to add');
    } finally { setAdding(false); }
  };

  const handleDownload = async (inline = false) => {
    if (!fileData) return;
    setDownloading(true);
    try {
      // For now rely on authenticated fileURL (if user has added or is owner / shared). Public direct download not implemented.
      const fileUrlData = await gqlFetch<{ fileURL: string }>(QUERY_FILE_URL, { fileId: fileData.file.id, inline });
      window.open(fileUrlData.fileURL, '_blank');
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || 'Download failed');
    } finally { setDownloading(false); }
  };

  const handleFileDownload = async (fileId: string, fileName: string, inline = false) => {
    setDownloadingFileId(fileId);
    try {
      // For now rely on authenticated fileURL (if user has added or is owner / shared). Public direct download not implemented.
      const fileUrlData = await gqlFetch<{ fileURL: string }>(QUERY_FILE_URL, { fileId, inline });
      if (inline) {
        window.open(fileUrlData.fileURL, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = fileUrlData.fileURL;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || 'Download failed');
    } finally { 
      setDownloadingFileId(null);
    }
  };

  const handleFilePreview = async (fileId: string) => {
    await handleFileDownload(fileId, '', true); // inline = true for preview
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-4xl">
        <h1 className="text-xl font-semibold mb-6 text-center">
          {type === 'file' ? 'Shared File' : type === 'folder' ? 'Shared Folder' : 'Shared Content'}
        </h1>
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        )}
        {!loading && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
            <div className="mt-3">
              <button onClick={load} className="text-xs underline">Retry</button>
            </div>
          </div>
        )}
        {!loading && fileData && type === 'file' && (
          <div className="space-y-4 bg-white border border-gray-200 rounded p-4 shadow-sm max-w-lg mx-auto">
            <div>
              <div className="text-sm text-gray-500">Filename</div>
              <div className="font-medium break-words">{fileData.file.originalName}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500">Type:</span> {fileData.file.mimeType}</div>
              <div><span className="text-gray-500">Size:</span> {formatSize(fileData.file.size)}</div>
              <div><span className="text-gray-500">Owner:</span> {fileData.owner.email}</div>
              <div><span className="text-gray-500">Created:</span> {new Date(fileData.file.createdAt).toLocaleString()}</div>
              {fileData.expiresAt && <div className="col-span-2"><span className="text-gray-500">Expires:</span> {new Date(fileData.expiresAt).toLocaleString()}</div>}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleDownload(false)}
                disabled={downloading}
                className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >{downloading ? 'Preparing...' : 'Download'}</button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >{adding ? 'Adding...' : 'Add to My Storage'}</button>
              {typeof window !== 'undefined' && !localStorage.getItem('token') && (
                <button
                  onClick={() => router.push('/login?return=' + encodeURIComponent(`/share/${token}`))}
                  className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >Login</button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >Dashboard</button>
            </div>
            <p className="text-[10px] text-gray-400 pt-2">Direct public downloads not yet enabled; you may need to login and add first.</p>
          </div>
        )}
        {!loading && folderData && type === 'folder' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
              <div>
                <div className="text-sm text-gray-500">Folder Name</div>
                <div className="font-medium break-words">{folderData.folder.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                <div><span className="text-gray-500">Owner:</span> {folderData.owner.email}</div>
                <div><span className="text-gray-500">Created:</span> {new Date(folderData.folder.createdAt).toLocaleString()}</div>
                {folderData.expiresAt && <div className="col-span-2"><span className="text-gray-500">Expires:</span> {new Date(folderData.expiresAt).toLocaleString()}</div>}
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                {typeof window !== 'undefined' && !localStorage.getItem('token') && (
                  <button
                    onClick={() => router.push('/login?return=' + encodeURIComponent(`/share/${token}`))}
                    className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                  >Login</button>
                )}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >Dashboard</button>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
              <h3 className="font-medium mb-3">Files in this folder</h3>
              {folderFiles.length === 0 ? (
                <p className="text-gray-500 text-sm">This folder is empty</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folderFiles.map((userFile) => (
                    <div key={userFile.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                      <div className="font-medium text-sm break-words mb-2">{userFile.file.originalName}</div>
                      <div className="text-xs text-gray-500 space-y-1 mb-3">
                        <div>Type: {userFile.file.mimeType}</div>
                        <div>Size: {formatSize(userFile.file.size)}</div>
                        <div>Created: {new Date(userFile.file.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => handleFilePreview(userFile.file.id)}
                          disabled={downloadingFileId === userFile.file.id}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {downloadingFileId === userFile.file.id ? 'Loading...' : 'Preview'}
                        </button>
                        <button
                          onClick={() => handleFileDownload(userFile.file.id, userFile.file.originalName, false)}
                          disabled={downloadingFileId === userFile.file.id}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {downloadingFileId === userFile.file.id ? 'Loading...' : 'Download'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
