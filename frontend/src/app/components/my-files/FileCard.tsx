import React from "react";
import Image from "next/image";
import { GqlUserFile } from "../types";
import { Eye, Info, MoveRight, Download, Trash, Share, Star } from "lucide-react";

interface Props {
  uf: GqlUserFile;
  onPreview: (uf: GqlUserFile) => void;
  onDetails: (uf: GqlUserFile) => void;
  onMove: (uf: GqlUserFile) => void;
  onDownload: (uf: GqlUserFile) => void;
  onDelete: (uf: GqlUserFile) => void;
  onShare: (uf: GqlUserFile) => void;
  onStar?: (uf: GqlUserFile) => void;
  isStarred?: boolean;
}

// helper to truncate filename by characters
const truncateText = (text: string, maxChars: number) => {
  return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
};

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
