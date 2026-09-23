"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "@/lib/url";
import { Image as ImageIcon, Video as VideoIcon, ShieldCheck } from "lucide-react";
import { EmptyState } from "../../../_components/EmptyState";
import RejectModal from "./RejectModal";

type Category = { id: number | string; name: string };

type Media = {
  id: number | string;
  uploader_id: number | string;
  category_id: number | string | null;
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

type Toast = { message: string; kind: "success" | "error" } | null;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function ModerationQueue({
  initialMedia,
  error,
}: {
  initialMedia: Media[];
  error: string | null;
}) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [rejecting, setRejecting] = useState<Media | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string | null>>({});
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), kind === "success" ? 3000 : 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function getCategoryValue(m: Media): string {
    const key = String(m.id);
    if (key in categoryOverrides) {
      const override = categoryOverrides[key];
      return override === null ? "" : String(override);
    }
    return String(m.category_id);
  }

  function clearOverride(mediaId: string) {
    setCategoryOverrides((prev) => {
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
  }

  async function loadCategories() {
    if (categoriesLoaded) return;
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {
      // ignore
    } finally {
      setCategoriesLoaded(true);
    }
  }

  function handleFocus() {
    loadCategories();
  }

  async function handleCategoryChange(m: Media, selectedValue: string) {
    const categoryId = selectedValue === "" ? null : Number(selectedValue);
    const key = String(m.id);
    const overrideValue = selectedValue === "" ? null : selectedValue;

    setCategoryOverrides((prev) => {
      const next = { ...prev };
      next[key] = overrideValue;
      return next;
    });

    setSavingCategory(key);

    try {
      const res = await fetch("/api/gallery/" + m.id + "/category", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 400 && data.message && data.message.includes("pending")) {
          setMedia((prev) => prev.filter((item) => item.id !== m.id));
          clearOverride(key);
          showToast(data.message, "error");
          return;
        }
        showToast(data.message ?? "Failed to update category", "error");
        clearOverride(key);
        return;
      }

      const updated = data.media as Media | undefined;
      setMedia((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? { ...item, category_id: updated?.category_id ?? categoryId, category_name: updated?.category_name ?? null }
            : item,
        ),
      );
      clearOverride(key);
      showToast("Category updated.", "success");
    } catch {
      showToast("Failed to update category", "error");
      clearOverride(key);
    } finally {
      setSavingCategory(null);
    }
  }

  async function handleApprove(m: Media) {
    setActionLoading(String(m.id));
    try {
      const res = await fetch("/api/gallery/" + m.id + "/approve", { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.message ?? "Approve failed", "error");
        return;
      }
      setMedia((prev) => prev.filter((item) => item.id !== m.id));
    } catch {
      showToast("Approve failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  function handleReject(m: Media) {
    loadCategories();
    setRejecting(m);
  }

  function handleRejected(id: number | string) {
    setMedia((prev) => prev.filter((item) => item.id !== id));
    setRejecting(null);
  }

  if (error) {
    return (
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
        {error}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck size={20} strokeWidth={1.5} aria-hidden="true" />}
        message="Nothing to review right now. All caught up."
      />
    );
  }

  return (
    <>
      {toast && (
        <div
          className="tokens-small inline-flex items-center gap-2 font-semibold"
          style={{
            borderRadius: "var(--radius-small)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: toast.kind === "success" ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            color: toast.kind === "success" ? "var(--color-success)" : "var(--color-danger)",
            marginBottom: "var(--space-4)",
          }}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <ul style={{ borderTop: "1px solid var(--color-line)" }}>
        {media.map((m) => {
          const src = resolveMediaUrl(m.file_url);
          const title = m.caption?.trim() || m.original_filename || "Untitled upload";
          const uploader = m.uploader_email || m.uploader_name || "Unknown";
          const isSaving = savingCategory === String(m.id);
          const currentCatValue = getCategoryValue(m);

          const catFallback =
            categories.length > 0 &&
            String(m.category_id) !== "" &&
            !categories.some((c) => String(c.id) === String(m.category_id));

          return (
            <li
              key={String(m.id)}
              className="flex min-h-[44px] flex-col gap-4 lg:flex-row"
              style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}
            >
              <span className="block aspect-[4/3] w-full shrink-0 overflow-hidden sm:max-w-xs lg:w-64" style={{ backgroundColor: "var(--color-background-deep)" }}>
                {m.media_type === "video" ? (
                  <video src={src} preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-3">
                  <span
                    className="tokens-small"
                    style={{
                      borderRadius: "var(--radius-pill)",
                      padding: "2px var(--space-3)",
                      fontWeight: 700,
                      fontSize: "0.6875rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      backgroundColor: "var(--color-warning-bg)",
                      color: "var(--color-warning)",
                    }}
                  >
                    Pending review
                  </span>
                  {m.media_type === "video" ? (
                    <VideoIcon size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--color-muted)" }} />
                  ) : (
                    <ImageIcon size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--color-muted)" }} />
                  )}
                </span>
                <span className="mt-2 block truncate text-sm font-bold" style={{ color: "var(--color-text)" }}>{title}</span>
                <span className="tokens-small mt-1 block" style={{ color: "var(--color-muted)" }}>
                  Uploaded by {uploader} · {formatDate(m.created_at)}
                </span>

                <span className="mt-3 block max-w-xs">
                  <label className="label-token" htmlFor={`mod-cat-${String(m.id)}`}>
                    Assign category{isSaving ? " · Saving…" : ""}
                  </label>
                  <select
                    id={`mod-cat-${String(m.id)}`}
                    value={currentCatValue}
                    disabled={isSaving}
                    onChange={(e) => handleCategoryChange(m, e.target.value)}
                    onFocus={handleFocus}
                    className="input-token disabled:opacity-60"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                    {catFallback && (
                      <option value={String(m.category_id)}>
                        {m.category_name || ("Category #" + String(m.category_id))}
                      </option>
                    )}
                    {categories.length === 0 && (
                      <option value={String(m.category_id)}>
                        {m.category_name || ("Category #" + String(m.category_id))}
                      </option>
                    )}
                  </select>
                </span>

                <span className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(m)}
                    disabled={actionLoading === String(m.id) || isSaving}
                    className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm disabled:opacity-60"
                  >
                    {actionLoading === String(m.id) ? "Approving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(m)}
                    disabled={actionLoading === String(m.id) || isSaving}
                    className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm disabled:opacity-60"
                  >
                    Reject
                  </button>
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {rejecting && (
        <RejectModal
          mediaId={rejecting.id}
          mediaTitle={rejecting.caption?.trim() || rejecting.original_filename || "Untitled upload"}
          onClose={() => setRejecting(null)}
          onRejected={handleRejected}
        />
      )}
    </>
  );
}
