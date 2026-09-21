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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Deactivate user"
        className="clay w-full max-w-md rounded-3xl bg-[#fdfaf3] p-6"
      >
        <h2 className="text-lg font-extrabold text-[#23344f]">Deactivate user?</h2>
        <p className="mt-2 text-sm text-[#66758d]">They will not be able to log in until reactivated.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f0e6d8] px-5 py-2 text-sm font-bold text-[#6b3d27] focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-[#ffe1d1] px-5 py-2 text-sm font-bold text-[#6b3d27] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? "Deactivating…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
