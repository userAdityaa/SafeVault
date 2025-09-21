import React from 'react';

interface BreadcrumbItem { id: string | null; name: string; }
interface Props {
  path: BreadcrumbItem[]; // always starts with Root
  onNavigate: (folderId: string | null) => void | Promise<void>;
  onNewFolder?: () => void;
  onGoToRoot?: () => void;
  currentFolderId?: string | null;
  folderCruding?: boolean;
}

export const Breadcrumb: React.FC<Props> = ({ path, onNavigate, onNewFolder, onGoToRoot, currentFolderId, folderCruding }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-5 flex items-center justify-between overflow-x-auto">
      <div className="flex items-center gap-1 text-xs sm:text-sm min-w-max">
        {path.map((p, idx) => {
          const isLast = idx === path.length - 1;
          return (
            <div key={p.id ?? 'root'} className="flex items-center gap-1">
              {idx > 0 && <span className="text-gray-400">/</span>}
              {isLast ? (
                <span className="text-gray-800 font-medium truncate max-w-[120px] sm:max-w-[180px]" title={p.name}>{p.name}</span>
              ) : (
                <button
                  className="px-1 sm:px-2 py-1 rounded text-blue-600 hover:bg-blue-50 truncate max-w-[100px] sm:max-w-[160px]"
                  onClick={() => onNavigate(p.id)}
                  title={p.name}
                >{p.name}</button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-shrink-0">
        {onNewFolder && (
          <button 
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-md sm:rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors" 
            onClick={onNewFolder} 
            disabled={folderCruding}
          >
            <span className="hidden sm:inline">New Folder</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
        {currentFolderId && onGoToRoot && (
          <button 
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-800 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors" 
            onClick={onGoToRoot}
          >
            <span className="hidden sm:inline">Go to Root</span>
            <span className="sm:hidden">Root</span>
          </button>
        )}
      </div>
    </div>
  );
};
