"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GqlUserFile, SearchState, GqlFolder } from "./types";
import { QUERY_SEARCH_MY_FILES, QUERY_MY_FOLDERS, QUERY_MY_FOLDER_FILES, MUTATION_CREATE_FOLDER, MUTATION_RENAME_FOLDER, MUTATION_DELETE_FOLDER, MUTATION_DELETE_FOLDER_RECURSIVE, MUTATION_MOVE_USER_FILE, MUTATION_DELETE_FILE, QUERY_MY_STARRED_ITEMS, MUTATION_STAR_FILE, MUTATION_UNSTAR_FILE, MUTATION_STAR_FOLDER, MUTATION_UNSTAR_FOLDER } from "./graphql";
import { gqlFetch, getFileURL, trackFileActivity } from "./api";
import { Breadcrumb } from "./my-files/Breadcrumb";
import { FolderGrid } from "./my-files/FolderGrid";
import { FoldersSkeletonGrid } from "./my-files/FolderSkeletons";
import { FileFilters } from "./my-files/FileFilters";
import { FilesGrid } from "./my-files/FilesGrid";
import { PreviewModal, FileDetailsModal, MovePickerModal, NewFolderModal, DeleteFolderModal, RenameFolderModal } from "./my-files/modals";
import { FilesSkeletonGrid, FileCardSkeleton } from "./my-files/FileSkeletons";
import ShareModal from "./ShareModal";

export default function MyFiles() {
  const [files, setFiles] = useState<GqlUserFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; url?: string; name?: string; mime?: string } | null>(null);
  const [details, setDetails] = useState<{ open: boolean; uf?: GqlUserFile } | null>(null);
  const [search, setSearch] = useState<SearchState>({ filename: "", mimeTypes: "", sizeMinMB: "", sizeMaxMB: "", createdAfter: "", createdBefore: "", tags: "", uploaderName: "" });
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  // Folders state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  // Stack representing path from root -> nested folders (each item: {id,name})
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);
  const [folders, setFolders] = useState<GqlFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderCruding, setFolderCruding] = useState(false);
  // Starred state
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());
  const [movePicker, setMovePicker] = useState<{ open: boolean; mappingId?: string } | null>(null);
  const [newFolderModal, setNewFolderModal] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [deleteFolderModal, setDeleteFolderModal] = useState<{ open: boolean; folder?: GqlFolder | null; recursive?: boolean }>({ open: false });
  const [renameFolderModal, setRenameFolderModal] = useState<{ open: boolean; folder?: GqlFolder | null; name: string }>({ open: false, name: "" });
  const [shareModal, setShareModal] = useState<{ open: boolean; itemType?: "file" | "folder"; itemId?: string; itemName?: string }>({ open: false });

  const buildFilter = () => {
    const f: Record<string, unknown> = {};
    if (search.filename.trim()) f.filename = search.filename.trim();
    const mimes = search.mimeTypes.split(",").map(s => s.trim()).filter(Boolean);
    if (mimes.length) f.mimeTypes = mimes;
    const minMB = parseFloat(search.sizeMinMB);
    if (!Number.isNaN(minMB)) f.sizeMin = Math.max(0, Math.floor(minMB * 1024 * 1024));
    const maxMB = parseFloat(search.sizeMaxMB);
    if (!Number.isNaN(maxMB)) f.sizeMax = Math.max(0, Math.floor(maxMB * 1024 * 1024));
    if (search.createdAfter) f.createdAfter = new Date(search.createdAfter).toISOString();
    if (search.createdBefore) f.createdBefore = new Date(search.createdBefore).toISOString();
    const tags = search.tags.split(",").map(s => s.trim()).filter(Boolean);
    if (tags.length) f.tags = tags;
    if (search.uploaderName.trim()) f.uploaderName = search.uploaderName.trim();
    return f;
  };

  const isSearchActive = () => {
    const s = search;
    return Boolean(
      s.filename.trim() ||
      s.mimeTypes.trim() ||
      s.sizeMinMB.trim() || s.sizeMaxMB.trim() ||
      s.createdAfter || s.createdBefore ||
      s.tags.trim() || s.uploaderName.trim()
    );
  };

  const searchFiles = async (reset: boolean) => {
    if (reset) {
      setFiles([]); // Clear files immediately for clean skeleton loading
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const variables: { filter: Record<string, unknown>; pagination: { limit: number; cursor: string | null } } = { filter: buildFilter(), pagination: { limit: 30, cursor: reset ? null : cursor } };
      const data = await gqlFetch<{ searchMyFiles: { edges: Array<{ node: GqlUserFile }>; pageInfo: { endCursor?: string; hasNextPage?: boolean } } }>(QUERY_SEARCH_MY_FILES, variables);
      const conn = data.searchMyFiles;
      const nodes: GqlUserFile[] = (conn.edges || []).map((e: { node: GqlUserFile }) => e.node);
      setFiles(prev => reset ? nodes : [...prev, ...nodes]);
      setCursor(conn.pageInfo?.endCursor || null);
      setHasNextPage(Boolean(conn.pageInfo?.hasNextPage));
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to load files");
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  };

  const fetchFolders = async (parentId: string | null) => {
    setFoldersLoading(true);
    try {
      const data = await gqlFetch<{ myFolders: GqlFolder[] }>(QUERY_MY_FOLDERS, { parentId });
      setFolders(data.myFolders || []);
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to load folders");
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  };

  const fetchFolderFiles = async (folderId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await gqlFetch<{ myFolderFiles: GqlUserFile[] }>(QUERY_MY_FOLDER_FILES, { folderId });
      setFiles(data.myFolderFiles || []);
      setCursor(null);
      setHasNextPage(false);
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (name: string) => {
    if (!name || !name.trim()) return;
    setFolderCruding(true);
    try {
      await gqlFetch(MUTATION_CREATE_FOLDER, { name, parentId: currentFolderId });
      toast.success("Folder created");
      fetchFolders(currentFolderId);
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to create folder");
    } finally {
      setFolderCruding(false);
    }
  };

  const renameFolder = async (folder: GqlFolder, newName: string) => {
    if (!newName || newName === folder.name) return;
    setFolderCruding(true);
    try {
      const data = await gqlFetch<{ renameFolder: boolean }>(MUTATION_RENAME_FOLDER, { folderId: folder.id, newName });
      if (!data?.renameFolder) throw new Error("Failed to rename folder");
      toast.success("Folder renamed");
      if (currentFolderId === folder.id) setCurrentFolderName(newName);
      // Update path entry
      setFolderPath(prev => prev.map(p => p.id === folder.id ? { ...p, name: newName } : p));
      fetchFolders(currentFolderId);
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to rename folder");
    } finally {
      setFolderCruding(false);
    }
  };

  const deleteFolder = async (folder: GqlFolder, recursive: boolean = false) => {
    setFolderCruding(true);
    try {
      const mutation = recursive ? MUTATION_DELETE_FOLDER_RECURSIVE : MUTATION_DELETE_FOLDER;
      const data = await gqlFetch<{ deleteFolder?: boolean; deleteFolderRecursive?: boolean }>(mutation, { folderId: folder.id });
      const success = recursive ? data?.deleteFolderRecursive : data?.deleteFolder;
      if (!success) throw new Error("Failed to delete folder");
      toast.success(`Folder ${recursive ? 'and all contents' : ''} deleted`);
      if (currentFolderId === folder.id) {
        setCurrentFolderId(folder.parentId || null);
        setCurrentFolderName(null);
        await fetchFolders(folder.parentId || null);
        await fetchFolderFiles(folder.parentId || null);
        // Trim path back to parent
        setFolderPath(prev => {
          const idx = prev.findIndex(p => p.id === folder.id);
          if (idx === -1) return prev;
            return prev.slice(0, idx); // parent will now be last (or root)
        });
      } else {
        fetchFolders(currentFolderId);
        if (currentFolderId === (folder.parentId || null)) {
          fetchFolderFiles(currentFolderId);
        }
      }
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to delete folder");
    } finally {
      setFolderCruding(false);
    }
  };

  const moveMappingToFolder = async (mappingId: string, folderId: string | null) => {
    try {
      const data = await gqlFetch<{ moveUserFile: boolean }>(MUTATION_MOVE_USER_FILE, { mappingId, folderId });
      if (!data?.moveUserFile) throw new Error("Failed to move file");
      toast.success("Moved");
      if (isSearchActive()) searchFiles(true); else fetchFolderFiles(currentFolderId);
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to move file");
    }
  };

  // Starred functions
  const loadStarredItems = async () => {
    try {
      const data = await gqlFetch<{ myStarredItems: Array<{ itemId: string }> }>(QUERY_MY_STARRED_ITEMS, {});
      const starred = new Set<string>();
      data.myStarredItems?.forEach((item: { itemId: string }) => {
        starred.add(item.itemId);
      });
      setStarredItems(starred);
    } catch (e: unknown) {
      console.error("Failed to load starred items:", e);
    }
  };

  const handleStarFile = async (uf: GqlUserFile) => {
    const fileId = uf.file.id;
    const isCurrentlyStarred = starredItems.has(fileId);
    
    try {
      if (isCurrentlyStarred) {
        await gqlFetch(MUTATION_UNSTAR_FILE, { fileId });
        setStarredItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        toast.success("File unstarred");
      } else {
        await gqlFetch(MUTATION_STAR_FILE, { fileId });
        setStarredItems(prev => new Set(prev).add(fileId));
        toast.success("File starred");
      }
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to update star status");
    }
  };

  const handleStarFolder = async (folder: GqlFolder) => {
    const folderId = folder.id;
    const isCurrentlyStarred = starredItems.has(folderId);
    
    try {
      if (isCurrentlyStarred) {
        await gqlFetch(MUTATION_UNSTAR_FOLDER, { folderId });
        setStarredItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(folderId);
          return newSet;
        });
        toast.success("Folder unstarred");
      } else {
        await gqlFetch(MUTATION_STAR_FOLDER, { folderId });
        setStarredItems(prev => new Set(prev).add(folderId));
        toast.success("Folder starred");
      }
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Failed to update star status");
    }
  };

  useEffect(() => {
    // Initial load: browse root
    fetchFolders(null);
    fetchFolderFiles(null);
    loadStarredItems();
    const onUpdated = () => {
      // Refresh both folders and files when files are updated
      fetchFolders(currentFolderId);
      if (isSearchActive()) searchFiles(true); else fetchFolderFiles(currentFolderId);
    };
    window.addEventListener("files:updated", onUpdated);
    return () => window.removeEventListener("files:updated", onUpdated);
  }, []);

  return (
    <div className="px-8 py-4 relative">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start justify-between">
          <span>{error}</span>
          <button className="text-xs underline" onClick={()=>{ setError(null); if (currentFolderId) fetchFolderFiles(currentFolderId); else fetchFolderFiles(null); }}>Retry</button>
        </div>
      )}

      {/* Folder Breadcrumb + Actions */}
      <Breadcrumb
        path={folderPath}
        onNavigate={async (targetId)=> {
          // slice path to targetId
            setCurrentFolderId(targetId);
            const idx = folderPath.findIndex(p=>p.id===targetId);
            if (idx >= 0) {
              const newPath = folderPath.slice(0, idx+1);
              setFolderPath(newPath);
              setCurrentFolderName(targetId ? newPath[newPath.length-1].name : null);
            } else if (targetId === null) {
              setFolderPath([{ id: null, name: 'Root' }]);
              setCurrentFolderName(null);
            }
            await fetchFolders(targetId);
            await fetchFolderFiles(targetId);
        }}
        onNewFolder={() => setNewFolderModal({ open: true, name: "" })}
        onGoToRoot={async () => {
          setCurrentFolderId(null);
          setCurrentFolderName(null);
          setFolderPath([{ id: null, name: 'Root' }]);
          await fetchFolders(null);
          await fetchFolderFiles(null);
        }}
        currentFolderId={currentFolderId}
        folderCruding={folderCruding}
      />

      {/* Folders Grid */}
      <div className="mb-6 relative">
        {foldersLoading && folders.length === 0 && (
          <FoldersSkeletonGrid count={4} />
        )}
        {!foldersLoading && (
          <FolderGrid
            folders={folders}
            onOpen={async (f)=>{ setCurrentFolderId(f.id); setCurrentFolderName(f.name); setFolderPath(prev=> [...prev, { id: f.id, name: f.name }]); await fetchFolders(f.id); await fetchFolderFiles(f.id); }}
            onRename={(f)=> setRenameFolderModal({ open: true, folder: f, name: f.name })}
            onDelete={(f)=> setDeleteFolderModal({ open: true, folder: f })}
            onShare={(f)=> setShareModal({ open: true, itemType: "folder", itemId: f.id, itemName: f.name })}
            onStar={handleStarFolder}
            getIsStarred={(folderId) => starredItems.has(folderId)}
          />
        )}
        {foldersLoading && folders.length > 0 && (
          <FoldersSkeletonGrid count={Math.min(folders.length, 4)} />
        )}
      </div>

      {/* Filters */}
      <FileFilters
        search={search}
        setSearch={setSearch}
        loading={loading}
        onSearch={()=>searchFiles(true)}
        onClear={()=>{ setSearch({ filename:"", mimeTypes:"", sizeMinMB:"", sizeMaxMB:"", createdAfter:"", createdBefore:"", tags:"", uploaderName:"" }); setCursor(null); setHasNextPage(false); setFiles([]); searchFiles(true); }}
      />
      {/* Files list */}
      <div className="relative min-h-[120px]">
        {(!files.length && loading) && (
          <FilesSkeletonGrid count={6} />
        )}
        {(files.length > 0) && (
          <>
            <FilesGrid
              files={files}
              onPreview={async (uf)=>{ 
                console.log('Tracking preview for file:', uf.file.id);
                await trackFileActivity(uf.file.id, 'preview');
                try { 
                  const url = await getFileURL(uf.fileId, true); 
                  setPreview({ open: true, url, name: uf.file.originalName, mime: uf.file.mimeType }); 
                } catch { 
                  const url = await getFileURL(uf.fileId, true); 
                  window.open(url, "_blank"); 
                } 
              }}
              onDetails={(uf)=> setDetails({ open: true, uf })}
              onMove={(uf)=> setMovePicker({ open: true, mappingId: uf.id })}
              onDownload={async (uf)=>{ 
                console.log('Tracking download for file:', uf.file.id);
                await trackFileActivity(uf.file.id, 'download');
                const url = await getFileURL(uf.fileId, false); 
                window.location.href = url; 
              }}
              onDelete={async (uf)=>{ try { const data = await gqlFetch<{ deleteFile: boolean }>(MUTATION_DELETE_FILE, { fileId: uf.fileId }); if (data?.deleteFile) { toast.success("Moved to Recently Deleted"); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("files:updated")); if (isSearchActive()) searchFiles(true); else fetchFolderFiles(currentFolderId); } } catch (e: unknown) { const error = e as Error; toast.error(error.message || "Delete failed"); } }}
              onShare={(uf)=> setShareModal({ open: true, itemType: "file", itemId: uf.fileId, itemName: uf.file.originalName })}
              onStar={handleStarFile}
              getIsStarred={(fileId) => starredItems.has(fileId)}
            />
            {loading && !loadingMore && (
              <div className="absolute inset-0 pointer-events-none bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </>
        )}
        {(files.length === 0 && !loading) && (
          <p className="text-gray-500">No files uploaded yet.</p>
        )}
      </div>
      
      {/* Load more only for search mode */}
      {isSearchActive() && files.length > 0 && hasNextPage && !loading && (
        <div className="mt-6 text-center">
          <button className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg" onClick={()=>searchFiles(false)} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {/* Modals */}
      <PreviewModal 
        open={Boolean(preview?.open && preview.url)} 
        name={preview?.name} url={preview?.url} 
        mime={preview?.mime} 
        onClose={()=> setPreview({ open: false })} />
      <FileDetailsModal 
        open={Boolean(details?.open)} 
        uf={details?.uf} 
        onClose={()=> setDetails({ open: false })}
      />
      <MovePickerModal
        open={Boolean(movePicker?.open)}
        folders={folders}
        onClose={()=> setMovePicker({ open: false })}
        onSelect={(folderId)=> { if(movePicker?.mappingId) moveMappingToFolder(movePicker.mappingId, folderId); }}
        onOpenFolder={async (f)=>{ await fetchFolders(f.id); setCurrentFolderId(f.id); setCurrentFolderName(f.name); setFolderPath(prev=> [...prev, { id: f.id, name: f.name }]); }}
      />
      <NewFolderModal
        open={newFolderModal.open} 
        name={newFolderModal.name} 
        setName={(v)=> setNewFolderModal(m=> ({ ...m, name: v }))} 
        onCreate={()=> { createFolder(newFolderModal.name).then(()=> setNewFolderModal({ open:false, name:"" })); }} 
        onClose={()=> setNewFolderModal({ open:false, name:"" })} />
      <DeleteFolderModal 
        open={deleteFolderModal.open} folder={deleteFolderModal.folder} disabled={folderCruding} 
        onCancel={()=> setDeleteFolderModal({ open:false, folder: null })} 
        onConfirm={async (recursive: boolean)=>{ if(deleteFolderModal.folder) await deleteFolder(deleteFolderModal.folder, recursive); setDeleteFolderModal({ open:false, folder:null }); }} />
      <RenameFolderModal 
        open={renameFolderModal.open} 
        folder={renameFolderModal.folder} 
        name={renameFolderModal.name} 
        setName={(v)=> setRenameFolderModal(m=> ({ ...m, name: v }))} 
        disabled={folderCruding} onCancel={()=> setRenameFolderModal({ open:false, folder:null, name:"" })} 
        onSave={async ()=>{ if(renameFolderModal.folder) await renameFolder(renameFolderModal.folder, renameFolderModal.name); setRenameFolderModal({ open:false, folder:null, name:"" }); }} />
      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false })}
        itemType={shareModal.itemType || "file"}
        itemId={shareModal.itemId || ""}
        itemName={shareModal.itemName || ""}
        onShareSuccess={() => {
          toast.success("Shared successfully");
          setShareModal({ open: false });
        }}
      />
    </div>
  );
}

