import React from 'react';
import { GqlUserFile } from '../types';
import { FileCard } from './FileCard';

interface Props {
  files: GqlUserFile[];
  onPreview: (uf: GqlUserFile) => void;
  onDetails: (uf: GqlUserFile) => void;
  onMove: (uf: GqlUserFile) => void;
  onDownload: (uf: GqlUserFile) => void;
  onDelete: (uf: GqlUserFile) => void;
  onShare: (uf: GqlUserFile) => void;
  onStar?: (uf: GqlUserFile) => void;
  getIsStarred?: (fileId: string) => boolean;
}

export const FilesGrid: React.FC<Props> = ({ files, onStar, getIsStarred, ...handlers }) => {
  if (!files.length) return <p className="text-gray-500">No files uploaded yet.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map(uf => (
        <FileCard 
          key={uf.id} 
          uf={uf} 
          onStar={onStar}
          isStarred={getIsStarred ? getIsStarred(uf.file.id) : false}
          {...handlers} 
        />
      ))}
    </div>
  );
};
