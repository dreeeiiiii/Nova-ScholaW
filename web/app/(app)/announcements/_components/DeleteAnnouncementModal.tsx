"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export default function DeleteAnnouncementModal({
  announcementId,
  announcementTitle,
  onClose,
  onDeleted,
}: {
  announcementId: number | string;
  announcementTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => cancelRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && overlayRef.current) {
        const nodes = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function onDelete() {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/announcements/${encodeURIComponent(String(announcementId))}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to delete");
        return;
      }
      onDeleted();
      onClose();
    } catch {
      setError("Failed to delete");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Delete announcement"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 40%, transparent)" }}
    >
      <div className="w-full max-w-md p-6" style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}>
        <div className="mb-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid var(--color-line)", paddingBottom: "var(--space-4)" }}>
          <h2 className="font-heading text-lg font-bold" style={{ color: "var(--color-text)" }}>Delete announcement</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] p-2"
            style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-line)", color: "var(--color-text)" }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm" style={{ color: "var(--color-text)" }}>
          Delete announcement &apos;{announcementTitle}&apos;? This cannot be undone.
        </p>

        {error && <p className="mt-3 tokens-small font-medium" style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "var(--space-2) var(--space-3)" }}>{error}</p>}

        <div className="mt-6 flex justify-end gap-3" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-4)" }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={pending}
            className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="tokens-btn !min-h-[44px] !px-5 !py-2 text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "var(--color-danger)", color: "var(--color-surface)" }}
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
