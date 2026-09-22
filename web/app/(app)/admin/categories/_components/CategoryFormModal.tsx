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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "Create category" : "Rename category"}
        className="clay max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#fdfaf3] p-4 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#23344f]">{mode === "create" ? "Add category" : "Rename category"}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e6d8] text-sm font-bold text-[#6b3d27] focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 min-h-[44px] min-w-[44px]">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-bold text-[#23344f]">Name *</span>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Category name"
              className="mt-1 w-full rounded-xl bg-white p-2.5 text-sm ring-1 ring-[#d9efff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9] min-h-[44px]"
              required
            />
            <span className="mt-1 block text-xs text-[#66758d]">{name.trim().length}/50</span>
          </label>

          {error && <p className="rounded-xl bg-[#ffe1d1] px-3 py-2 text-sm font-medium text-[#6b3d27]">{error}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-[#f0e6d8] px-5 py-2.5 text-sm font-bold text-[#6b3d27] focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 min-h-[44px] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#dff5e8] px-5 py-2.5 text-sm font-bold text-[#246044] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 disabled:opacity-60 min-h-[44px] sm:w-auto"
            >
              {submitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
