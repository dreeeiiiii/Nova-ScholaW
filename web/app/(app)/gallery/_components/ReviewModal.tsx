"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckBig, X } from "lucide-react";

export default function ReviewModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (onClose) onClose();
        else {
          router.push("/gallery/mine");
          router.refresh();
        }
      }
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
  }, [onClose, router]);

  function handleDone() {
    if (onClose) onClose();
    router.push("/gallery/mine");
    router.refresh();
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      if (onClose) onClose();
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Upload successful"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 40%, transparent)" }}
    >
      <div className="relative w-full max-w-md p-6 text-center" style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}>
        <button
          type="button"
          onClick={() => (onClose ? onClose() : handleDone())}
          aria-label="Close"
          className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center"
          style={{ borderRadius: "var(--radius-small)", border: "1px solid var(--color-line)", color: "var(--color-text)" }}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center"
          style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-success-bg)" }}
        >
          <CircleCheckBig size={28} style={{ color: "var(--color-success)" }} aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-bold" style={{ color: "var(--color-text)" }}>Upload successful</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Your upload is now live in the gallery. Admins may remove it later if it violates our guidelines.
        </p>
        <div style={{ borderTop: "1px solid var(--color-line)", marginTop: "var(--space-6)", paddingTop: "var(--space-4)" }}>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleDone}
            className="tokens-btn tokens-btn-primary w-full text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
