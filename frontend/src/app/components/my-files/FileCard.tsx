/**
 * @fileoverview FileCard component for displaying individual files in a grid layout.
 * This component shows file information and provides action buttons for file operations.
 */

import React from "react";
import Image from "next/image";
import { GqlUserFile } from "../types";
import { Eye, Info, MoveRight, Download, Trash, Share, Star } from "lucide-react";

/**
 * Props for the FileCard component.
 */
interface Props {
  /** User-file association data to display */
  uf: GqlUserFile;
  /** Callback when user wants to preview the file */
  onPreview: (uf: GqlUserFile) => void;
  /** Callback when user wants to view file details */
  onDetails: (uf: GqlUserFile) => void;
  /** Callback when user wants to move the file */
  onMove: (uf: GqlUserFile) => void;
  /** Callback when user wants to download the file */
  onDownload: (uf: GqlUserFile) => void;
  /** Callback when user wants to delete the file */
  onDelete: (uf: GqlUserFile) => void;
  /** Callback when user wants to share the file */
  onShare: (uf: GqlUserFile) => void;
  /** Optional callback when user wants to star/unstar the file */
  onStar?: (uf: GqlUserFile) => void;
  /** Whether the file is currently starred */
  isStarred?: boolean;
}

/**
 * Helper function to truncate long text with ellipsis.
 * Ensures file names don't overflow the card layout.
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxChars - Maximum characters before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
const truncateText = (text: string, maxChars: number) => {
  return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
};

/**
 * FileCard component displays a single file with its metadata and action buttons.
 * Used in grid layouts to show user files with hover effects and interactive elements.
 * Provides quick access to common file operations like preview, download, and sharing.
 * 
 * @param {Props} props - Component properties
 * @returns {JSX.Element} Rendered file card component
 */
export const FileCard: React.FC<Props> = ({
  uf,
  onPreview,
  onDetails,
  onMove,
  onDownload,
  onDelete,
  onShare,
  onStar,
  isStarred = false,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 transition hover:shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Image
          src="/files.svg"
          alt="file icon"
          width={32}
          height={32}
          className="opacity-80"
        />
        <div className="flex-1">
          <div className="font-semibold text-gray-800">
            {truncateText(uf.file.originalName, 25)}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(uf.uploadedAt).toLocaleDateString()} •{" "}
            {(uf.file.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
        {onStar && (
          <button
            onClick={() => onStar(uf)}
            className={`p-1 rounded transition ${
              isStarred 
                ? "text-yellow-500 hover:text-yellow-600" 
                : "text-gray-400 hover:text-yellow-500"
            }`}
            title={isStarred ? "Unstar file" : "Star file"}
          >
            <Star className={`w-5 h-5 ${isStarred ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          onClick={() => onPreview(uf)}
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
          onClick={() => onDetails(uf)}
        >
          <Info className="w-4 h-4" /> Details
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
          onClick={() => onMove(uf)}
        >
          <MoveRight className="w-4 h-4" /> Move
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
          onClick={() => onShare(uf)}
        >
          <Share className="w-4 h-4" /> Share
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          onClick={() => onDownload(uf)}
        >
          <Download className="w-4 h-4" /> Download
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
          onClick={() => onDelete(uf)}
        >
          <Trash className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
};
