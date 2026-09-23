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
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 40%, transparent)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reject ${mediaTitle}`}
    >
      <div className="w-full max-w-md p-6" style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}>
        <div className="flex items-start justify-between gap-4" style={{ borderBottom: "1px solid var(--color-line)", paddingBottom: "var(--space-4)" }}>
          <div>
            <h2 className="font-heading text-lg font-bold" style={{ color: "var(--color-text)" }}>Reject upload</h2>
            <p className="tokens-small mt-1" style={{ color: "var(--color-muted)" }}>{mediaTitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            style={{ borderRadius: "var(--radius-small)", border: "1px solid var(--color-line)", color: "var(--color-text)" }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="mt-4 tokens-small font-medium" style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "var(--space-3) var(--space-4)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="reject-reason" className="label-token">
              Rejection reason *
            </label>
            <textarea
              ref={textareaRef}
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this upload is being rejected…"
              className="input-token"
            />
            <p className="tokens-small mt-1" style={{ color: "var(--color-muted)" }}>Minimum {MIN_REASON_LENGTH} characters.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onClose}
              className="tokens-btn tokens-btn-secondary w-full !min-h-[44px] text-sm sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="tokens-btn w-full !min-h-[44px] text-sm font-bold disabled:opacity-60 sm:w-auto"
              style={{ backgroundColor: "var(--color-danger)", color: "var(--color-surface)" }}
            >
              {loading ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
