"use client";

import { useState, useEffect } from "react";
import { Images as ImagesIcon } from "lucide-react";
import ModerationQueue from "./ModerationQueue";
import { EmptyState } from "../../../_components/EmptyState";
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
    <div>
      <div
        className="flex gap-6"
        role="tablist"
        aria-label="Moderation views"
        style={{ borderBottom: "1px solid var(--color-line)" }}
      >
        {(
          [
            { key: "pending", label: "Pending" },
            { key: "recent", label: "Recently uploaded" },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className="inline-flex min-h-[44px] items-center text-sm font-bold transition-colors duration-200 motion-reduce:transition-none"
              style={{
                color: isActive ? "var(--color-text)" : "var(--color-muted)",
                boxShadow: isActive ? "inset 0 -2px 0 var(--color-primary)" : "none",
                paddingInline: "2px",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        {activeTab === "pending" && <ModerationQueue initialMedia={initialPending} error={pendingError} />}

        {activeTab === "recent" && (
          <div>
            {recentLoading && <p className="tokens-small" style={{ color: "var(--color-muted)" }}>Loading recent uploads…</p>}
            {recentError && (
              <div
                className="tokens-small"
                style={{
                  borderRadius: "var(--radius-small)",
                  backgroundColor: "var(--color-danger-bg)",
                  color: "var(--color-danger)",
                  padding: "var(--space-3) var(--space-4)",
                  fontWeight: 600,
                }}
              >
                {recentError}
              </div>
            )}
            {!recentLoading && !recentError && recentMedia.length === 0 && (
              <EmptyState
                icon={<ImagesIcon size={20} strokeWidth={1.5} aria-hidden="true" />}
                message="No recent uploads."
              />
            )}
            {!recentLoading && recentMedia.length > 0 && (
              <ul style={{ borderTop: "1px solid var(--color-line)" }}>
                {recentMedia.map((m) => {
                  const src = resolveMediaUrl(m.file_url);
                  const title = m.caption?.trim() || m.original_filename || "Untitled upload";
                  const uploader = m.uploader_email || m.uploader_name || "Unknown";
                  return (
                    <li
                      key={String(m.id)}
                      className="flex min-h-[44px] gap-4"
                      style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}
                    >
                      <span className="block h-20 w-20 shrink-0 overflow-hidden" style={{ backgroundColor: "var(--color-background-deep)" }}>
                        {m.media_type === "video" ? (
                          <video src={src} preload="metadata" className="h-full w-full object-cover" />
                        ) : (
                          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold" style={{ color: "var(--color-text)" }}>{title}</span>
                        <span className="tokens-small mt-1 block" style={{ color: "var(--color-muted)" }}>
                          Uploaded by {uploader} · {formatDate(m.created_at)}
                        </span>
                        <span className="tokens-small block" style={{ color: "var(--color-muted)" }}>
                          Caption: {m.caption || "—"}
                        </span>
                        <span className="mt-2 block">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(m)}
                            disabled={deleting === String(m.id)}
                            className="inline-flex min-h-[44px] items-center text-sm font-semibold disabled:opacity-60"
                            style={{ color: "var(--color-danger)" }}
                          >
                            Delete
                          </button>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {confirmDelete && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 40%, transparent)" }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setConfirmDelete(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  className="w-full max-w-md p-6"
                  style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}
                >
                  <h2 className="font-heading font-bold" style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-line)", paddingBottom: "var(--space-4)" }}>Delete this upload?</h2>
                  <p className="tokens-small mt-4" style={{ color: "var(--color-muted)" }}>This will permanently delete the media. This cannot be undone.</p>
                  <div className="mt-6 flex justify-end gap-3" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-4)" }}>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(confirmDelete)}
                      disabled={deleting === String(confirmDelete.id)}
                      className="tokens-btn !min-h-[44px] !px-5 !py-2 text-sm font-bold disabled:opacity-60"
                      style={{ backgroundColor: "var(--color-danger)", color: "var(--color-surface)" }}
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
    </div>
  );
}
