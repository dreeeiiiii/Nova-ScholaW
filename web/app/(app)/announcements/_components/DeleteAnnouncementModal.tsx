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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Delete announcement"
    >
      <div className="clay w-full max-w-md rounded-[2rem] bg-[#fdfaf3] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-heading text-lg font-bold text-[#23344f]">Delete announcement</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl bg-white p-2 shadow focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm text-text-main">
          Delete announcement &apos;{announcementTitle}&apos;? This cannot be undone.
        </p>

        {error && <p className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-text-main shadow focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-full bg-[#8b3a2c] px-5 py-2.5 text-sm font-bold text-white shadow focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 disabled:opacity-60"
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
