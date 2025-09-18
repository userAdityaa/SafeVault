"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  uploader: { email: string; name?: string | null; picture?: string | null };
};

export default function MyFiles() {
  const [files, setFiles] = useState<GqlUserFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; url?: string; name?: string; mime?: string } | null>(null);
  const [details, setDetails] = useState<{ open: boolean; uf?: GqlUserFile } | null>(null);

  const fetchFiles = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
    setLoading(true);
    setError(null);
    try {
  const query = `query MyFiles { myFiles { id userId fileId uploadedAt file { id hash originalName mimeType size refCount visibility createdAt } uploader { email name picture } } }`;
      const res = await fetch("http://localhost:8080/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message || "Failed to load files");
      setFiles(json.data.myFiles || []);
    } catch (e: any) {
      setError(e.message || "Failed to load files");
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

  if (loading) return <div className="p-8">Loading files…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">My Files</h2>
      {files.length === 0 ? (
        <p className="text-gray-500">No files uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((uf) => (
            <div key={uf.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Image src="/files.svg" alt="file icon" width={24} height={24} />
                <div className="font-medium text-blue-600 truncate">{uf.file.originalName}</div>
              </div>
              <div className="text-sm text-gray-500 mt-2">{(uf.file.size / (1024 * 1024)).toFixed(2)} MB</div>
              <div className="text-xs text-gray-400 mt-1">Uploaded: {new Date(uf.uploadedAt).toLocaleString()}</div>
              <div className="mt-3 flex gap-2">
                <button
                  className="px-3 py-1 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={async () => {
                    try {
                      const url = await getFileURL(uf.fileId, true);
                      setPreview({ open: true, url, name: uf.file.originalName, mime: uf.file.mimeType });
                    } catch (e) {
                      // Fallback: open externally
                      const url = await getFileURL(uf.fileId, true);
                      window.open(url, "_blank");
                    }
                  }}
                >
                  Preview
                </button>
                <button
                  className="px-3 py-1 text-sm rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
                  onClick={() => setDetails({ open: true, uf })}
                >
                  Details
                </button>
                <button
                  className="px-3 py-1 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={async () => {
                    const url = await getFileURL(uf.fileId, false);
                    // Navigate to URL to let browser download (Content-Disposition: attachment)
                    window.location.href = url;
                  }}
                >
                  Download
                </button>
                <button
                  className="px-3 py-1 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 ml-auto"
                  onClick={async () => {
                    try {
                      const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
                      const mutation = `mutation Delete($fileId: ID!) { deleteFile(fileId: $fileId) }`;
                      const res = await fetch("http://localhost:8080/query", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Accept: "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ query: mutation, variables: { fileId: uf.fileId } }),
                      });
                      const json = await res.json();
                      if (json.errors) throw new Error(json.errors[0]?.message || "Failed to delete file");
                      if (json.data?.deleteFile) {
                        toast.success("Moved to Recently Deleted");
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("files:updated"));
                        }
                        fetchFiles();
                      }
                    } catch (e: any) {
                      toast.error(e.message || "Delete failed");
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview?.open && preview.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{preview.name}</h3>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setPreview({ open: false })}>✕</button>
            </div>
            {renderPreview(preview.url, preview.mime)}
            <div className="mt-3 text-right">
              <a href={preview.url} target="_blank" className="text-blue-600 underline">Open in new tab</a>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {details?.open && details.uf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">File details</h3>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setDetails({ open: false })}>✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500">Name</div>
                <div className="text-gray-900 font-medium break-words">{details.uf.file.originalName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Size</div>
                  <div className="text-gray-900 font-medium">{(details.uf.file.size / (1024*1024)).toFixed(2)} MB</div>
                </div>
                <div>
                  <div className="text-gray-500">Uploaded</div>
                  <div className="text-gray-900 font-medium">{new Date(details.uf.uploadedAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Content hash (SHA-256)</div>
                  <div className="text-gray-900 font-mono text-xs break-all">{details.uf.file.hash}</div>
                </div>
                <div>
                  <div className="text-gray-500">Deduplicated refs</div>
                  <div className="text-gray-900 font-medium">{details.uf.file.refCount}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {details.uf.uploader?.picture ? (
                  <img src={details.uf.uploader.picture} alt="Uploader" className="w-8 h-8 rounded-full border object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full border bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
                    {details.uf.uploader?.name?.charAt(0) || details.uf.uploader?.email?.charAt(0) || "?"}
                  </div>
                )}
                <div>
                  <div className="text-gray-900 font-medium">{details.uf.uploader?.name || details.uf.uploader?.email}</div>
                  <div className="text-gray-500 text-xs">{details.uf.uploader?.email}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setDetails({ open: false })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function getFileURL(fileId: string, inline: boolean): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
  const query = `query FileURL($fileId: ID!, $inline: Boolean) { fileURL(fileId: $fileId, inline: $inline) }`;
  const res = await fetch("http://localhost:8080/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables: { fileId, inline } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Failed to get URL");
  return json.data.fileURL as string;
}

function renderPreview(url: string, mime?: string) {
  if (!mime) mime = "";
  if (mime.startsWith("image/")) {
    return <img src={url} alt="preview" className="max-h-[75vh] mx-auto" />;
  }
  if (mime.startsWith("video/")) {
    return <video src={url} controls className="max-h-[75vh] w-full" />;
  }
  if (mime === "application/pdf") {
    return <iframe src={url} className="w-full h-[75vh]" />;
  }
  // Fallback: link to open
  return (
    <div className="text-center">
      <a href={url} target="_blank" className="text-blue-600 underline">Open file</a>
    </div>
  );
}
