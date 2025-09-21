import React from "react";
import Image from "next/image";
import { GqlFolder } from "../types";
import { FolderOpen, Edit3, Trash2, Share, Star } from "lucide-react";

interface Props {
  folders: GqlFolder[];
  onOpen: (folder: GqlFolder) => void | Promise<void>;
  onRename: (folder: GqlFolder) => void;
  onDelete: (folder: GqlFolder) => void;
  onShare: (folder: GqlFolder) => void;
  onStar?: (folder: GqlFolder) => void;
  getIsStarred?: (folderId: string) => boolean;
}

export const FolderGrid: React.FC<Props> = ({
  folders,
  onOpen,
  onRename,
  onDelete,
  onShare,
  onStar,
  getIsStarred,
}) => {
  if (!folders.length)
    return (
      <div className="text-gray-500 text-sm italic text-center">
        No folders here yet.
      </div>
    );

  return (
    <div className="grid grid-cols-1 mt-[2rem] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {folders.map((f) => (
        <div
          key={f.id}
          className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition flex flex-col"
        >
          {/* Folder header */}
          <div className="flex items-center gap-3">
            <Image
              src="/folder.svg"
              alt="folder icon"
              width={34}
              height={34}
              className="opacity-80"
            />
            <div
              className="font-semibold text-gray-800 truncate flex-1"
              title={f.name}
            >
              {f.name.length > 20 ? f.name.slice(0, 20) + "..." : f.name}
            </div>
            {onStar && (
              <button
                onClick={() => onStar(f)}
                className={`p-1 rounded transition ${
                  getIsStarred && getIsStarred(f.id)
                    ? "text-yellow-500 hover:text-yellow-600" 
                    : "text-gray-400 hover:text-yellow-500"
                }`}
                title={getIsStarred && getIsStarred(f.id) ? "Unstar folder" : "Star folder"}
              >
                <Star className={`w-4 h-4 ${getIsStarred && getIsStarred(f.id) ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
              onClick={() => onOpen(f)}
            >
              <FolderOpen className="w-4 h-4" /> Open
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
              onClick={() => onRename(f)}
            >
              <Edit3 className="w-4 h-4" /> Rename
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
              onClick={() => onShare(f)}
            >
              <Share className="w-4 h-4" /> Share
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
              onClick={() => onDelete(f)}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
