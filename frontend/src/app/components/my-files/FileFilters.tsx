import React from 'react';
import { SearchState } from '../types';

interface Props {
  search: SearchState;
  setSearch: React.Dispatch<React.SetStateAction<SearchState>>;
  onSearch: () => void;
  onClear: () => void;
  loading: boolean;
}

export const FileFilters: React.FC<Props> = ({ search, setSearch, onSearch, onClear, loading }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Filename</label>
          <input value={search.filename} onChange={e=>setSearch(s=>({...s, filename:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. report" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">MIME Types (comma)</label>
          <input value={search.mimeTypes} onChange={e=>setSearch(s=>({...s, mimeTypes:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="image/png, application/pdf" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Uploader Name</label>
          <input value={search.uploaderName} onChange={e=>setSearch(s=>({...s, uploaderName:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Alex" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Size Min (MB)</label>
          <input type="number" min={0} value={search.sizeMinMB} onChange={e=>setSearch(s=>({...s, sizeMinMB:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Size Max (MB)</label>
          <input type="number" min={0} value={search.sizeMaxMB} onChange={e=>setSearch(s=>({...s, sizeMaxMB:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="100" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tags (comma)</label>
          <input value={search.tags} onChange={e=>setSearch(s=>({...s, tags:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="finance, q3" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Created After</label>
          <input type="datetime-local" value={search.createdAfter} onChange={e=>setSearch(s=>({...s, createdAfter:e.target.value}))} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Created Before</label>
          <input type="datetime-local" value={search.createdBefore} onChange={e=>setSearch(s=>({...s, createdBefore:e.target.value}))} className="w-full border rounded-lg px-3 py-2" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={onSearch} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg" onClick={onClear}>Clear</button>
      </div>
    </div>
  );
};
