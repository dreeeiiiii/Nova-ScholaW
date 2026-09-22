"use client";

import { useState, useEffect } from "react";
import ModerationQueue from "./ModerationQueue";
import { resolveMediaUrl } from "@/lib/url";

type Media = {
  id: number | string;
  uploader_id: number | string;
  category_id: number | string;
  media_type: string;
  file_url: string;
  original_filename: string;
  caption: string | null;
  status: string;
  category_name: string | null;
  uploader_name: string | null;
  uploader_email: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function ModerationTabs({
  initialPending,
  pendingError,
}: {
  initialPending: Media[];
  pendingError: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"pending" | "recent">("pending");
  const [recentMedia, setRecentMedia] = useState<Media[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "recent") return;
    let cancelled = false;
    async function loadRecent() {
      setRecentLoading(true);
      setRecentError(null);
      try {
        const res = await fetch("/api/gallery/recent?limit=50");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load recent uploads");
        }
        const data = await res.json();
        if (!cancelled) setRecentMedia(data.media ?? []);
      } catch (e) {
        if (!cancelled) setRecentError(e instanceof Error ? e.message : "Failed to load recent uploads");
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    }
    loadRecent();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  async function handleDelete(m: Media) {
    setDeleting(String(m.id));
    try {
      const res = await fetch(`/api/gallery/${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete");
      }
      setRecentMedia((prev) => prev.filter((x) => String(x.id) !== String(m.id)));
      setConfirmDelete(null);
    } catch (e) {
      // For now, just close and maybe show error - we'll use recentError
      setRecentError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`rounded-full px-5 py-2.5 text-sm font-bold min-h-[44px] ${activeTab === "pending" ? "bg-[#315c86] text-white" : "bg-[#fdfaf3] text-[#23344f] clay"}`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("recent")}
          className={`rounded-full px-5 py-2.5 text-sm font-bold min-h-[44px] ${activeTab === "recent" ? "bg-[#315c86] text-white" : "bg-[#fdfaf3] text-[#23344f] clay"}`}
        >
          Recently uploaded
        </button>
      </div>

      {activeTab === "pending" && <ModerationQueue initialMedia={initialPending} error={pendingError} />}

      {activeTab === "recent" && (
        <div className="space-y-4">
          {recentLoading && <p className="text-sm text-text-muted">Loading recent uploads…</p>}
          {recentError && <div className="rounded-2xl bg-[#ffe1d1] px-4 py-3 text-sm font-medium text-[#6b3d27]">{recentError}</div>}
          {!recentLoading && !recentError && recentMedia.length === 0 && (
            <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
              <p className="text-sm font-medium text-[#23344f]">No recent uploads</p>
            </div>
          )}
          {!recentLoading && recentMedia.length > 0 && (
            <div className="grid gap-5 xl:grid-cols-2">
              {recentMedia.map((m) => {
                const src = resolveMediaUrl(m.file_url);
                const title = m.caption?.trim() || m.original_filename || "Untitled upload";
                const uploader = m.uploader_email || m.uploader_name || "Unknown";
                return (
                  <article key={String(m.id)} className="clay overflow-hidden rounded-3xl bg-[#fdfaf3] p-6">
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#fbf7ef]">
                      {m.media_type === "video" ? (
                        <video src={src} preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <h3 className="mt-4 font-bold text-[#23344f]">{title}</h3>
                    <p className="mt-1 text-sm text-[#66758d]">Uploaded by: {uploader}</p>
                    <p className="mt-1 text-xs text-[#66758d]">{formatDate(m.created_at)}</p>
                    <p className="mt-1 text-xs text-[#66758d]">Caption: {m.caption || "—"}</p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(m)}
                        disabled={deleting === String(m.id)}
                        className="rounded-full bg-[#ffe1d1] px-4 py-2.5 text-sm font-bold text-[#6b3d27] hover:brightness-95 disabled:opacity-60 min-h-[44px]"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {confirmDelete && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setConfirmDelete(null);
              }}
            >
              <div role="dialog" aria-modal="true" className="clay w-full max-w-md rounded-3xl bg-[#fdfaf3] p-6">
                <h2 className="font-bold text-[#23344f]">Delete this upload?</h2>
                <p className="mt-2 text-sm text-[#66758d]">This will permanently delete the media. This cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-full bg-[#f0e6d8] px-5 py-2.5 text-sm font-bold text-[#6b3d27] min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(confirmDelete)}
                    disabled={deleting === String(confirmDelete.id)}
                    className="rounded-full bg-[#ffe1d1] px-5 py-2.5 text-sm font-bold text-[#6b3d27] disabled:opacity-60 min-h-[44px]"
                  >
                    {deleting === String(confirmDelete.id) ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
