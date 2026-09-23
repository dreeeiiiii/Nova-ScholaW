"use client";

import { useEffect, useRef, useState } from "react";

type Category = { id: number | string; name: string; created_at?: string };

export default function CategoryFormModal({
  mode,
  initial,
  onClose,
  onSaved,
  onError,
}: {
  mode: "create" | "edit";
  initial?: Category;
  onClose: () => void;
  onSaved: (category: Category) => void;
  onError?: (message: string, status?: number) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (trimmed.length < 1 || trimmed.length > 50) {
      setError("Name must be 1–50 characters");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/categories" : `/api/categories/${encodeURIComponent(String(initial!.id))}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          const msg = "A category with this name already exists.";
          setError(msg);
          onError?.(msg, 409);
          return;
        }
        const msg = (data as { message?: string })?.message ?? "Failed to save category";
        setError(msg);
        onError?.(msg, res.status);
        return;
      }
      const saved = (data as { category?: Category }).category ?? (data as Category);
      // Ensure saved has id and name
      const cat: Category = {
        id: saved.id ?? initial?.id ?? "",
        name: saved.name ?? trimmed,
        created_at: saved.created_at ?? initial?.created_at,
      };
      onSaved(cat);
    } catch {
      const msg = "Failed to save category";
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
        aria-label={mode === "create" ? "Create category" : "Rename category"}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto p-4 sm:p-6"
        style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}
      >
        <div className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-line)", paddingBottom: "var(--space-4)" }}>
          <h2 className="font-heading text-lg font-extrabold" style={{ color: "var(--color-text)" }}>{mode === "create" ? "Add category" : "Rename category"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-bold"
            style={{ borderRadius: "var(--radius-small)", border: "1px solid var(--color-line)", color: "var(--color-text)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="label-token">Name *</span>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Category name"
              className="input-token"
              required
            />
            <span className="tokens-small mt-1 block" style={{ color: "var(--color-muted)" }}>{name.trim().length}/50</span>
          </label>

          {error && <p className="tokens-small font-medium" style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "var(--space-2) var(--space-3)" }}>{error}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onClose}
              className="tokens-btn tokens-btn-secondary w-full !min-h-[44px] text-sm sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="tokens-btn tokens-btn-primary w-full !min-h-[44px] text-sm disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
