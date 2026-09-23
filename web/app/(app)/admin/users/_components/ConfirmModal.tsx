"use client";

import { useEffect, useRef } from "react";

export default function ConfirmModal({
  onClose,
  onConfirm,
  loading = false,
}: {
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
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
        aria-label="Deactivate user"
        className="w-full max-w-md p-6"
        style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}
      >
        <h2 className="font-heading text-lg font-extrabold" style={{ color: "var(--color-text)" }}>Deactivate user?</h2>
        <p className="tokens-small mt-2" style={{ color: "var(--color-muted)" }}>They will not be able to log in until reactivated.</p>
        <div className="mt-6 flex justify-end gap-3" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-4)" }}>
          <button
            type="button"
            onClick={onClose}
            className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="tokens-btn !min-h-[44px] !px-5 !py-2 text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "var(--color-danger)", color: "var(--color-surface)" }}
          >
            {loading ? "Deactivating…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
