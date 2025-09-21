"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GRAPHQL_ENDPOINT } from "@/lib/backend";
import { FilesSkeletonGrid } from "./my-files/FileSkeletons";

type GqlFile = {
  id: string;
  hash: string;
  originalName: string;
  mimeType: string;
  size: number;
  refCount: number;
  visibility: string;
  createdAt: string;
};

type GqlUserFile = {
  id: string;
  userId: string;
  fileId: string;
  uploadedAt: string;
  file: GqlFile;
};

export default function DeletedFiles() {
  const [files, setFiles] = useState<GqlUserFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
    setLoading(true);
    setError(null);
    try {
      const query = `query MyDeletedFiles { myDeletedFiles { id userId fileId uploadedAt file { id hash originalName mimeType size refCount visibility createdAt } uploader { email name picture } } }`;
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message || "Failed to load deleted files");
      setFiles(json.data.myDeletedFiles || []);
    } catch (e: any) {
      setError(e.message || "Failed to load deleted files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    const onUpdated = () => fetchFiles();
    window.addEventListener("files:updated", onUpdated);
    return () => window.removeEventListener("files:updated", onUpdated);
  }, []);

  const purge = async (fileId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
    try {
      const mutation = `mutation Purge($fileId: ID!) { purgeFile(fileId: $fileId) }`;
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: mutation, variables: { fileId } }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message || "Failed to purge file");
      if (json.data?.purgeFile) {
        toast.success("File permanently deleted");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("files:updated"));
        }
        fetchFiles();
      } else {
        throw new Error("Failed to purge file");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to purge file");
    }
  };

  const recover = async (fileId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
    try {
      const mutation = `mutation Recover($fileId: ID!) { recoverFile(fileId: $fileId) }`;
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: mutation, variables: { fileId } }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message || "Failed to recover file");
      if (json.data?.recoverFile) {
        toast.success("File recovered successfully");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("files:updated"));
        }
        fetchFiles();
      } else {
        throw new Error("Failed to recover file");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to recover file");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Deleted</h2>
        <FilesSkeletonGrid count={6} />
      </div>
    );
  }
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Deleted</h2>
      {files.length === 0 ? (
        <p className="text-gray-500">No deleted files.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((uf) => (
            <div key={uf.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Image src="/delete.svg" alt="deleted icon" width={20} height={20} />
                <div className="font-medium text-gray-800 truncate">{uf.file.originalName}</div>
              </div>
              <div className="text-sm text-gray-500 mt-2">{(uf.file.size / (1024 * 1024)).toFixed(2)} MB</div>
              <div className="text-xs text-gray-400 mt-1">Uploaded: {new Date(uf.uploadedAt).toLocaleString()}</div>
              <div className="mt-3 flex gap-2">
                <button
                  className="px-3 py-1 text-sm rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  onClick={() => recover(uf.fileId)}
                >
                  Recover
                </button>
                <button
                  className="px-3 py-1 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  onClick={() => purge(uf.fileId)}
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
