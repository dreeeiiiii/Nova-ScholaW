"use client";

import { useEffect, useRef, useState } from "react";

type Category = { id: number | string; name: string; created_at?: string };

export default function DeleteCategoryModal({
  category,
  onClose,
  onDeleted,
  onError,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: (id: number | string) => void;
  onError?: (message: string, status?: number) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(String(category.id))}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { message?: string })?.message ?? "Failed to delete category";
        setError(msg);
        onError?.(msg, res.status);
        return;
      }
      onDeleted(category.id);
    } catch {
      const msg = "Failed to delete category";
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Delete category"
        className="clay max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#fdfaf3] p-4 sm:p-6"
      >
        <h2 className="text-lg font-extrabold text-[#23344f]">Delete &ldquo;{category.name}&rdquo;?</h2>
        <p className="mt-2 text-sm text-[#66758d]">
          Media in this category will have its category cleared. The media itself is not deleted.
        </p>

        {error && <p className="mt-3 rounded-xl bg-[#ffe1d1] px-3 py-2 text-sm font-medium text-[#6b3d27]">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[#f0e6d8] px-5 py-2.5 text-sm font-bold text-[#6b3d27] focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 min-h-[44px] sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="w-full rounded-full bg-[#ffe1d1] px-5 py-2.5 text-sm font-bold text-[#6b3d27] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 disabled:opacity-60 min-h-[44px] sm:w-auto"
          >
            {submitting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
