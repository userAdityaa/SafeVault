import React from 'react';

const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const FolderCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 border">
      <div className="flex items-center gap-2">
        <Block className="w-5 h-5 rounded" />
        <Block className="h-4 w-2/3" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Block className="h-6 w-16" />
        <Block className="h-6 w-16" />
        <Block className="h-6 w-16" />
      </div>
    </div>
  );
};

export const FoldersSkeletonGrid: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <FolderCardSkeleton key={i} />
      ))}
    </div>
  );
};
