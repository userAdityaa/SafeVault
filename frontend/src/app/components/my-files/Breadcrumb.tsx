import React from 'react';

interface BreadcrumbItem { id: string | null; name: string; }
interface Props {
  path: BreadcrumbItem[]; // always starts with Root
  onNavigate: (folderId: string | null) => void | Promise<void>;
}

export const Breadcrumb: React.FC<Props> = ({ path, onNavigate }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex items-center justify-between overflow-x-auto">
      <div className="flex items-center gap-1 text-sm min-w-max">
        {path.map((p, idx) => {
          const isLast = idx === path.length - 1;
          return (
            <div key={p.id ?? 'root'} className="flex items-center gap-1">
              {idx > 0 && <span className="text-gray-400">/</span>}
              {isLast ? (
                <span className="text-gray-800 font-medium truncate max-w-[180px]" title={p.name}>{p.name}</span>
              ) : (
                <button
                  className="px-2 py-1 rounded text-blue-600 hover:bg-blue-50 truncate max-w-[160px]"
                  onClick={() => onNavigate(p.id)}
                  title={p.name}
                >{p.name}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
