"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

const graphqlUpload = (file: File, token?: string, onProgress?: (pct: number) => void, allowDuplicate?: boolean) => {
  return new Promise<{ data?: any; errors?: any }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:8080/query");
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (xhr.upload) {
      xhr.upload.addEventListener("loadstart", () => onProgress && onProgress(1));
      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress && onProgress(Math.min(99, Math.max(1, pct)));
      });
      xhr.upload.addEventListener("load", () => onProgress && onProgress(100));
    }

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        resolve(json);
      } catch (e) {
        reject(new Error("Invalid JSON response"));
      }
    };

    const mutation = `mutation UploadFiles($input: UploadFileInput!) {\n  uploadFiles(input: $input) {\n    id\n    userId\n    fileId\n    uploadedAt\n    file { id hash originalName mimeType size visibility createdAt }\n  }\n}`;

      const operations: any = {
        query: mutation,
        variables: { input: { files: [null] } },
      };
      if (allowDuplicate) {
        operations.variables.input.allowDuplicate = true;
      }
    const map = { "0": ["variables.input.files.0"] } as Record<string, string[]>;

    const form = new FormData();
    form.append("operations", JSON.stringify(operations));
    form.append("map", JSON.stringify(map));
    form.append("0", file, file.name);

    xhr.send(form);
  });
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dupModal, setDupModal] = useState<{ open: boolean; current?: { item: UploadItem; matchName: string; hash: string } } | null>(null);

  const sha256 = async (file: File) => {
    const buf = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const startUploads = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;

    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      progress: 0,
      status: "queued",
    }));
    setUploads((prev) => [...newItems, ...prev]);

    for (const item of newItems) {
      let allowDup = false;
      try {
        const hash = await sha256(item.file);
        const query = `query Find($hash: String!) { findMyFileByHash(hash: $hash) { id file { originalName } } }`;
        const res = await fetch("http://localhost:8080/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query, variables: { hash } }),
        });
        const json = await res.json();
        const match = json?.data?.findMyFileByHash;
        if (match) {
          // open modal and wait for user choice
          await new Promise<void>((resolve) => {
            setDupModal({ open: true, current: { item, matchName: match.file.originalName, hash } });
            const handler = (e: any) => {
              if (e.detail?.action === "continue" && e.detail?.hash === hash && e.detail?.id === item.id) {
                window.removeEventListener("dup:response", handler);
                allowDup = true;
                resolve();
              } else if (e.detail?.action === "skip" && e.detail?.hash === hash && e.detail?.id === item.id) {
                window.removeEventListener("dup:response", handler);
                // Mark skipped by removing from queue display
                toast.info(`Skipped ${item.file.name}`);
                // do not upload
                throw new Error("skip");
              }
            };
            window.addEventListener("dup:response", handler);
          });
          setDupModal({ open: false });
        }
      } catch (e: any) {
        if (e?.message === "skip") continue;
      }

      setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "uploading", progress: 1 } : u)));

      graphqlUpload(
        item.file,
        token,
        (pct: number) => setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u))),
        allowDup
      )
        .then((res) => {
          if (res.errors) {
            const message = String(res.errors[0]?.message || "Upload failed");
            setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "error", error: message } : u)));
            toast.error(message);
            return;
          }
          setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "done", progress: 100 } : u)));
          toast.success(`${item.file.name} has been uploaded`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("files:updated"));
          }
        })
        .catch((err) => {
          if (err?.message === "skip") return;
          setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "error", error: err.message } : u)));
          toast.error(err.message || "Upload error");
        });
    }

    // Reset the input to allow re-selecting the same files
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-8">
      <Toaster richColors position="top-right" />

      <h1>All Files</h1>

      {/* Uploads List */}
      {uploads.length > 0 && (
        <div className="mt-4 mb-6 space-y-3">
          {uploads.map((u) => (
            <div key={u.id} className="bg-white border rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.file.name}</p>
                  <p className="text-xs text-gray-500">{(u.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <div className="text-xs font-medium">
                  {u.status === "uploading" && <span className="text-blue-600">{u.progress}%</span>}
                  {u.status === "done" && <span className="text-green-600">Done</span>}
                  {u.status === "error" && <span className="text-red-600">Error</span>}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-200 ${
                    u.status === "error" ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              {u.status === "error" && u.error && (
                <p className="text-xs text-red-600 mt-1">{u.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File Folders Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        {/* Add New / Drag & Drop */}
        <div
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const files = e.dataTransfer.files;
            await startUploads(files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
          }}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${dragOver ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-500 hover:text-blue-600"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-2xl mb-3">+</div>
          <p className="font-medium text-gray-600">Add New or Drag & Drop</p>
          <p className="text-xs text-gray-500 mt-1">Drop files here to upload</p>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => startUploads(e.target.files)} />
      </section>

      {/* Duplicate Modal */}
      {dupModal?.open && dupModal.current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900">Duplicate file detected</h3>
            <p className="text-sm text-gray-600 mt-2">
              <span className="font-medium">{dupModal.current.item.file.name}</span> content matches with
              <span className="font-medium"> {dupModal.current.matchName}</span>. Do you still want to upload it?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setDupModal({ open: false });
                  window.dispatchEvent(new CustomEvent("dup:response", { detail: { action: "skip", hash: dupModal.current!.hash, id: dupModal.current!.item.id } }));
                }}
              >
                Skip
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setDupModal({ open: false });
                  window.dispatchEvent(new CustomEvent("dup:response", { detail: { action: "continue", hash: dupModal.current!.hash, id: dupModal.current!.item.id } }));
                }}
              >
                Continue Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Files Table (placeholder) */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-600">Recent Files</h3>
        </div>
        <div className="grid grid-cols-4 gap-6 text-gray-600 font-medium border-b pb-3">
          <div>Name</div>
          <div>Shared Users</div>
          <div>File Size</div>
          <div>Last Modified</div>
        </div>
      </section>
    </div>
  );
}
