import React, { useState } from 'react';
import { GqlFolder, GqlUserFile } from '../types';
import Downloads from '../Downloads';
import Avatar from '../Avatar';

// Preview renderer moved from original file
export function renderPreview(url: string, mime?: string) {
  if (!mime) mime = '';
  if (mime.startsWith('image/')) return <img src={url} alt="preview" className="max-h-[75vh] mx-auto" />;
  if (mime.startsWith('video/')) return <video src={url} controls className="max-h-[75vh] w-full" />;
  if (mime === 'application/pdf') return <iframe src={url} className="w-full h-[75vh]" />;
  return <div className="text-center"><a href={url} target="_blank" className="text-blue-600 underline">Open file</a></div>;
}

export const PreviewModal: React.FC<{ open: boolean; name?: string; url?: string; mime?: string; onClose: () => void; }> = ({ open, name, url, mime, onClose }) => {
  if (!open || !url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto p-3 sm:p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">{name}</h3>
          <button className="text-gray-600 hover:text-gray-900 flex-shrink-0 p-1" onClick={onClose}>✕</button>
        </div>
        {renderPreview(url, mime)}
        <div className="mt-3 text-right">
          <a href={url} target="_blank" className="text-blue-600 underline text-sm">Open in new tab</a>
        </div>
      </div>
    </div>
  );
};

export const FileDetailsModal: React.FC<{ open: boolean; uf?: GqlUserFile; onClose: () => void; }> = ({ open, uf, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'analytics'>('details');

  if (!open || !uf) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-3 sm:p-5 border-b">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">File Details</h3>
          <button className="text-gray-600 hover:text-gray-900 p-1" onClick={onClose}>✕</button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium ${
              activeTab === 'details' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            File Information
          </button>
          <button
            className={`px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium ${
              activeTab === 'analytics' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            Download Analytics
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'details' ? (
            <div className="p-3 sm:p-5">
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-gray-500">Name</div>
                  <div className="text-gray-900 font-medium break-words">{uf.file.originalName}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-500">Size</div>
                    <div className="text-gray-900 font-medium">{(uf.file.size / (1024*1024)).toFixed(2)} MB</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Uploaded</div>
                    <div className="text-gray-900 font-medium">{new Date(uf.uploadedAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-500">Content hash (SHA-256)</div>
                    <div className="text-gray-900 font-mono text-xs break-all">{uf.file.hash}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Deduplicated refs</div>
                    <div className="text-gray-900 font-medium">{uf.file.refCount}</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                  <Avatar
                    src={uf.uploader?.picture}
                    alt={`${uf.uploader?.name || uf.uploader?.email || 'Uploader'} profile`}
                    size={32}
                    fallbackText={uf.uploader?.name?.charAt(0) || uf.uploader?.email?.charAt(0) || '?'}
                  />
                  <div>
                    <div className="text-gray-900 font-medium">{uf.uploader?.name || uf.uploader?.email}</div>
                    <div className="text-gray-500 text-xs">{uf.uploader?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-5">
              <Downloads fileId={uf.file.id} />
            </div>
          )}
        </div>

        <div className="p-3 sm:p-5 border-t text-right">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export const MovePickerModal: React.FC<{ open: boolean; folders: GqlFolder[]; onClose: () => void; onSelect: (folderId: string | null) => void; onOpenFolder: (folder: GqlFolder)=>void; }> = ({ open, folders, onClose, onSelect, onOpenFolder }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-3 sm:p-5 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Move to…</h3>
          <button className="text-gray-600 hover:text-gray-900 p-1" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          <button className="w-full text-left px-3 py-2 rounded border hover:bg-gray-50 text-sm" onClick={()=>{ onSelect(null); onClose(); }}>Root</button>
          <div className="max-h-48 sm:max-h-64 overflow-auto border rounded">
            {folders.length === 0 ? (
              <div className="text-sm text-gray-500 p-3">No folders here</div>
            ) : (
              folders.map(f => (
                <div key={f.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                  <div className="truncate pr-2 text-sm">{f.name}</div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <button className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => onOpenFolder(f)}>Open</button>
                    <button className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100" onClick={()=> { onSelect(f.id); onClose(); }}>Select</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-4 text-right">
          <button className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export const NewFolderModal: React.FC<{ open: boolean; name: string; setName: (v: string)=>void; onCreate: ()=>void; onClose: ()=>void; }> = ({ open, name, setName, onCreate, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-3 sm:p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Create new folder</h3>
          <button className="text-gray-600 hover:text-gray-900 p-1" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm text-gray-600">Folder name</label>
          <input autoFocus value={name} onChange={e=> setName(e.target.value)} onKeyDown={e=> { if(e.key==='Enter') onCreate(); }} placeholder="e.g. Project A" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <button className="px-3 sm:px-4 py-2 sm:mr-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm order-2 sm:order-1" onClick={onClose}>Cancel</button>
          <button className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 text-sm order-1 sm:order-2" disabled={!name.trim()} onClick={onCreate}>Create</button>
        </div>
      </div>
    </div>
  );
};

export const DeleteFolderModal: React.FC<{ open: boolean; folder?: GqlFolder | null; onCancel: ()=>void; onConfirm: (recursive: boolean)=>void; disabled?: boolean; }> = ({ open, folder, onCancel, onConfirm, disabled }) => {
  const [recursive, setRecursive] = useState(false);
  
  if (!open || !folder) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-3 sm:p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Delete folder</h3>
          <button className="text-gray-600 hover:text-gray-900 p-1" onClick={onCancel}>✕</button>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed mb-4">
          Are you sure you want to delete the folder <span className="font-medium break-words">&quot;{folder.name}&quot;</span>?
        </div>
        <div className="mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Delete all contents (subfolders and files) recursively
            </span>
          </label>
          <div className="text-xs text-gray-500 mt-1 ml-6">
            {recursive ? 
              "All files and subfolders will be permanently deleted." : 
              "Files inside will be moved to Root folder."
            }
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <button className="px-3 sm:px-4 py-2 sm:mr-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm order-2 sm:order-1" onClick={onCancel} disabled={disabled}>Cancel</button>
          <button 
            className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 text-sm order-1 sm:order-2" 
            disabled={disabled} 
            onClick={() => onConfirm(recursive)}
          >
            Delete {recursive ? 'All' : 'Folder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const RenameFolderModal: React.FC<{ open: boolean; folder?: GqlFolder | null; name: string; setName: (v: string)=>void; onSave: ()=>void; onCancel: ()=>void; disabled?: boolean; }> = ({ open, folder, name, setName, onSave, onCancel, disabled }) => {
  if (!open || !folder) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-3 sm:p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Rename folder</h3>
          <button className="text-gray-600 hover:text-gray-900 p-1" onClick={onCancel}>✕</button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm text-gray-600">New name</label>
          <input autoFocus value={name} onChange={e=> setName(e.target.value)} onKeyDown={e=> { if(e.key==='Enter') onSave(); }} placeholder="Folder name" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <button className="px-3 sm:px-4 py-2 sm:mr-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm order-2 sm:order-1" onClick={onCancel} disabled={disabled}>Cancel</button>
          <button className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 text-sm order-1 sm:order-2" disabled={!name.trim() || disabled} onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
};
