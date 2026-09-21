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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Ready for review"
    >
      <div className="clay w-full max-w-md rounded-[2rem] bg-[#fdfaf3] p-6 text-center">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : handleDone())}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-xl bg-white p-2 shadow focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
          <CircleCheckBig size={28} className="text-success" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-bold text-[#23344f]">Ready for review</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Your media submission has entered the admin review queue. It will remain unpublished until approved.
        </p>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={handleDone}
          className="mt-6 w-full rounded-full bg-[#315c86] px-6 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
        >
          Done
        </button>
      </div>
    </div>
  );
}
