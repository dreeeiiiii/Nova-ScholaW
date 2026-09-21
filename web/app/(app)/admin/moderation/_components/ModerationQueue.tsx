"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "@/lib/url";
import { Image, Video } from "lucide-react";
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
      <div className="rounded-2xl bg-[#ffe1d1] px-4 py-3 text-sm font-medium text-[#6b3d27]">{error}</div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
        <p className="text-sm font-medium text-[#23344f]">No pending uploads</p>
        <p className="mt-1 text-xs text-[#66758d]">All caught up — nothing waiting for review.</p>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div
          className={`flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
            toast.kind === "success"
              ? "bg-[#dff5e8] text-[#246044]"
              : "bg-[#ffe1d1] text-[#6b3d27]"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
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
            <article key={String(m.id)} className="clay overflow-hidden rounded-3xl bg-[#fdfaf3] p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-[#ffe1d1] px-3 py-1 text-xs font-bold text-[#6b3d27]">
                  Pending review
                </span>
                {m.media_type === "video" ? (
                  <Video size={18} className="shrink-0 text-[#66758d]" aria-hidden="true" />
                ) : (
                  <Image size={18} className="shrink-0 text-[#66758d]" aria-hidden="true" />
                )}
              </div>

              <div className="mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-[#fbf7ef]">
                {m.media_type === "video" ? (
                  <video src={src} preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>

              <h3 className="mt-4 font-bold text-[#23344f]">{title}</h3>
              <p className="mt-2 text-sm text-[#66758d]">Uploaded by: {uploader}</p>

              <label className="mt-4 block text-sm font-bold text-[#23344f]">
                Assign category
                {isSaving && <span className="ml-2 text-xs font-normal text-[#66758d]">Saving…</span>}
              </label>
              <select
                value={currentCatValue}
                disabled={isSaving}
                onChange={(e) => handleCategoryChange(m, e.target.value)}
                onFocus={handleFocus}
                className="mt-2 w-full rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9] disabled:opacity-60"
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

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleApprove(m)}
                  disabled={actionLoading === String(m.id) || isSaving}
                  className="rounded-full bg-[#dff5e8] px-4 py-2 text-sm font-bold text-[#246044] hover:brightness-95 disabled:opacity-60"
                >
                  {actionLoading === String(m.id) ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(m)}
                  disabled={actionLoading === String(m.id) || isSaving}
                  className="rounded-full bg-[#ffe1d1] px-4 py-2 text-sm font-bold text-[#6b3d27] hover:brightness-95 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>

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
