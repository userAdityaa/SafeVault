"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { gqlFetch } from "./api";

interface ShareData {
  id: string;
  sharedWithEmail: string;
  permission: string;
  sharedAt: string;
  expiresAt?: string | null;
}

interface ShareResponse {
  fileShares?: ShareData[];
  folderShares?: ShareData[];
}

interface PublicLinkResponse {
  createPublicFileLink?: {
    token: string;
    url: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
  };
  createPublicFolderLink?: {
    token: string;
    url: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
  };
}

import { 
  MUTATION_CREATE_PUBLIC_FILE_LINK,
  MUTATION_REVOKE_PUBLIC_FILE_LINK,
  MUTATION_CREATE_PUBLIC_FOLDER_LINK,
  MUTATION_REVOKE_PUBLIC_FOLDER_LINK,
} from "./graphql";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "file" | "folder";
  itemId: string;
  itemName: string;
  onShareSuccess?: () => void;
}

interface ShareInput {
  emails: string;
  // Backend currently only supports 'viewer' permission. Keep type literal for future expansion.
  permission: "viewer"; 
  expiresAt?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  onShareSuccess,
}: ShareModalProps) {
  const [shareInput, setShareInput] = useState<ShareInput>({ emails: "", permission: "viewer" });
  const [isLoading, setIsLoading] = useState(false);
  const [existingShares, setExistingShares] = useState<ShareData[]>([]);
  const [showExistingShares, setShowExistingShares] = useState(false);
  // Public link state
  const [publicLink, setPublicLink] = useState<{
    token: string;
    url: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
  } | null>(null);
  const [plExpiresAt, setPlExpiresAt] = useState<string>("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);

  // (Optional future) we could load existing public link if backend exposes a query; for now assume none until created in session.
  useEffect(() => {
    if (!isOpen) {
      // reset ephemeral states when modal closes
      setPublicLink(null);
      setPlExpiresAt("");
      setShowExistingShares(false);
      setExistingShares([]);
    }
  }, [isOpen]);

  const handleShare = async () => {
    if (!shareInput.emails.trim()) {
      toast.error("Please enter at least one email address");
      return;
    }

    const emailList = shareInput.emails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      toast.error("Please enter valid email addresses");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email format: ${invalidEmails.join(", ")}`);
      return;
    }

    setIsLoading(true);

    try {
      const mutation = itemType === "file" 
        ? `mutation ShareFile($input: ShareFileInput!) { shareFile(input: $input) { id sharedWithEmail permission sharedAt } }`
        : `mutation ShareFolder($input: ShareFolderInput!) { shareFolder(input: $input) { id sharedWithEmail permission sharedAt } }`;

      await gqlFetch(mutation, {
        input: {
          [itemType === "file" ? "fileId" : "folderId"]: itemId,
          emails: emailList,
          permission: "viewer", // enforce supported permission
          ...(shareInput.expiresAt ? { expiresAt: new Date(shareInput.expiresAt).toISOString() } : {}),
        },
      });

      toast.success(`${itemType === "file" ? "File" : "Folder"} shared with ${emailList.length} user(s)`);
      setShareInput({ emails: "", permission: "viewer" });
      onShareSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to share");
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingShares = async () => {
    if (showExistingShares) {
      setShowExistingShares(false);
      return;
    }

    try {
      const query = itemType === "file"
        ? `query FileShares($fileId: ID!) { fileShares(fileId: $fileId) { id sharedWithEmail permission sharedAt expiresAt } }`
        : `query FolderShares($folderId: ID!) { folderShares(folderId: $folderId) { id sharedWithEmail permission sharedAt expiresAt } }`;

      const data = await gqlFetch<ShareResponse>(query, { [itemType === "file" ? "fileId" : "folderId"]: itemId });
      const shares = data[itemType === "file" ? "fileShares" : "folderShares"] || [];
      setExistingShares(shares);
      setShowExistingShares(true);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to load existing shares");
    }
  };

  const handleUnshare = async (sharedWithEmail: string) => {
    try {
      const mutation = itemType === "file"
        ? `mutation UnshareFile($fileId: ID!, $sharedWithEmail: String!) { unshareFile(fileId: $fileId, sharedWithEmail: $sharedWithEmail) }`
        : `mutation UnshareFolder($folderId: ID!, $sharedWithEmail: String!) { unshareFolder(folderId: $folderId, sharedWithEmail: $sharedWithEmail) }`;

      await gqlFetch(mutation, { [itemType === "file" ? "fileId" : "folderId"]: itemId, sharedWithEmail });
      toast.success(`Unshared with ${sharedWithEmail}`);
      setShowExistingShares(false);
      loadExistingShares();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to unshare");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">
            Share {itemType === "file" ? "File" : "Folder"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Sharing: <span className="font-medium">{itemName}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email addresses (comma-separated)
            </label>
            <textarea
              value={shareInput.emails}
              onChange={(e) =>
                setShareInput({ ...shareInput, emails: e.target.value })
              }
              placeholder="user1@example.com, user2@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permission</label>
            <div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-700 flex items-center justify-between">
              <span>Viewer (read-only)</span>
              <span className="text-xs text-gray-400">only option</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires at (optional)
            </label>
            <input
              type="datetime-local"
              value={shareInput.expiresAt || ""}
              onChange={(e) =>
                setShareInput({ ...shareInput, expiresAt: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={loadExistingShares}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showExistingShares ? "Hide" : "View"} existing shares
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>

        {/* Existing Shares */}
        {showExistingShares && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Current shares
            </h3>
            {existingShares.length === 0 ? (
              <p className="text-sm text-gray-500">
                This {itemType} is not shared with anyone yet.
              </p>
            ) : (
              <div className="space-y-2">
                {existingShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                  >
                    <div>
                      <div className="font-medium">{share.sharedWithEmail}</div>
                      <div className="text-gray-500 text-xs">
                        {share.permission} • {new Date(share.sharedAt).toLocaleDateString()}
                        {share.expiresAt && ` • Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnshare(share.sharedWithEmail)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Public Link Section */}
        <div className="mt-6 border-t pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
            Anyone with the link
            {publicLink && !publicLink.revokedAt && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700">active</span>
            )}
          </h3>
          {publicLink ? (
            <div className="space-y-2 text-sm">
              <div className="break-all bg-gray-50 border border-gray-200 p-2 rounded select-all cursor-text text-xs">
                {typeof window !== 'undefined' ? `${window.location.origin}${publicLink.url}` : publicLink.url}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const full = typeof window !== 'undefined' ? `${window.location.origin}${publicLink.url}` : publicLink.url;
                    navigator.clipboard.writeText(full).then(() => toast.success("Link copied"));
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >Copy</button>
                <button
                  disabled={revokingLink}
                  onClick={async () => {
                    try {
                      setRevokingLink(true);
                      const mutation = itemType === 'file' ? MUTATION_REVOKE_PUBLIC_FILE_LINK : MUTATION_REVOKE_PUBLIC_FOLDER_LINK;
                      await gqlFetch(mutation, { [itemType === 'file' ? 'fileId' : 'folderId']: itemId });
                      setPublicLink(null); // treat as removed
                      toast.success('Public link revoked');
                    } catch (e: unknown) {
                      const error = e as Error;
                      toast.error(error.message || 'Failed to revoke link');
                    } finally { setRevokingLink(false); }
                  }}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >{revokingLink ? 'Revoking...' : 'Revoke'}</button>
              </div>
              {publicLink.expiresAt && (
                <div className="text-xs text-gray-500">Expires {new Date(publicLink.expiresAt).toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={plExpiresAt}
                  onChange={(e) => setPlExpiresAt(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                />
                <button
                  disabled={creatingLink}
                  onClick={async () => {
                    try {
                      setCreatingLink(true);
                      const mutation = itemType === 'file' ? MUTATION_CREATE_PUBLIC_FILE_LINK : MUTATION_CREATE_PUBLIC_FOLDER_LINK;
                      const vars: Record<string, unknown> = { [itemType === 'file' ? 'fileId' : 'folderId']: itemId };
                      if (plExpiresAt) vars.expiresAt = new Date(plExpiresAt).toISOString();
                      const data = await gqlFetch<PublicLinkResponse>(mutation, vars);
                      const key = itemType === 'file' ? 'createPublicFileLink' : 'createPublicFolderLink';
                      const created = data[key];
                      if (created) {
                        setPublicLink({
                          token: created.token,
                          url: created.url.startsWith('/') ? created.url : `/${created.url}`,
                          expiresAt: created.expiresAt,
                          revokedAt: created.revokedAt,
                        });
                        toast.success('Public link created');
                      } else {
                        toast.error('Failed to create public link');
                      }
                    } catch (e: unknown) {
                      const error = e as Error;
                      toast.error(error.message || 'Failed to create public link');
                    } finally { setCreatingLink(false); }
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >{creatingLink ? 'Creating...' : 'Create link'}</button>
              </div>
              <p className="text-xs text-gray-500">Optionally set an expiration, then generate a public link anyone can use.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}