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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 40%, transparent)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Delete category"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto p-4 sm:p-6"
        style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}
      >
        <h2 className="font-heading text-lg font-extrabold" style={{ color: "var(--color-text)", borderBottom: "1px solid var(--color-line)", paddingBottom: "var(--space-4)" }}>Delete &ldquo;{category.name}&rdquo;?</h2>
        <p className="tokens-small mt-4" style={{ color: "var(--color-muted)" }}>
          Media in this category will have its category cleared. The media itself is not deleted.
        </p>

        {error && <p className="tokens-small mt-3 font-medium" style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "var(--space-2) var(--space-3)" }}>{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-4)" }}>
          <button
            type="button"
            onClick={onClose}
            className="tokens-btn tokens-btn-secondary w-full !min-h-[44px] text-sm sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="tokens-btn w-full !min-h-[44px] text-sm font-bold disabled:opacity-60 sm:w-auto"
            style={{ backgroundColor: "var(--color-danger)", color: "var(--color-surface)" }}
          >
            {submitting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
