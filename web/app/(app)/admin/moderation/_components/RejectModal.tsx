"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const MIN_REASON_LENGTH = 10;

export default function RejectModal({
  mediaId,
  mediaTitle,
  onClose,
  onRejected,
}: {
  mediaId: number | string;
  mediaTitle: string;
  onClose: () => void;
  onRejected: (id: number | string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Rejection reason is required.");
      return;
    }
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(`Reason must be at least ${MIN_REASON_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/gallery/${mediaId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Rejection failed");
        return;
      }
      onRejected(mediaId);
    } catch {
      setError("Rejection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reject ${mediaTitle}`}
    >
      <div className="clay w-full max-w-md rounded-[2rem] bg-[#fdfaf3] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#23344f]">Reject upload</h2>
            <p className="mt-1 text-sm text-[#66758d]">{mediaTitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl bg-white p-2 shadow"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-[#ffe1d1] px-4 py-3 text-sm font-medium text-[#6b3d27]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="reject-reason" className="block text-sm font-bold text-[#23344f]">
              Rejection reason *
            </label>
            <textarea
              ref={textareaRef}
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this upload is being rejected…"
              className="mt-1.5 block w-full rounded-2xl border border-[#d9d7e2] bg-white px-4 py-2.5 text-sm text-[#23344f] placeholder-[#66758d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
            />
            <p className="mt-1 text-xs text-[#66758d]">Minimum {MIN_REASON_LENGTH} characters.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#23344f] shadow hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#ffe1d1] px-5 py-2.5 text-sm font-bold text-[#6b3d27] hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
