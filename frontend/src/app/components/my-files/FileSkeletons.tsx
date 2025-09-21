import React from 'react';

// A simple pulse animation skeleton block
const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const FileCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border">
      <div className="flex items-start gap-3">
        <Block className="w-8 h-8 rounded-md" />
        <div className="flex-1 space-y-2 min-w-0">
          <Block className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Block className="h-3 w-20" />
            <Block className="h-3 w-16" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Block className="h-8 w-20" />
        <Block className="h-8 w-14" />
        <Block className="h-8 w-16 hidden sm:block" />
        <Block className="h-8 w-20 hidden sm:block" />
      </div>
    </div>
  );
};

export const FilesSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <FileCardSkeleton key={i} />
      ))}
    </div>
  );
};
