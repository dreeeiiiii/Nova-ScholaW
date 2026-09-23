"use client";

import { useEffect, useRef } from "react";

type NavDrawerProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  /** "fullscreen" (HomeNav, dark) or "panel" (internal MobileNav, light). */
  variant?: "fullscreen" | "panel";
};

/**
 * Shared drawer shell: ESC to close, outside-click to close,
 * body scroll lock, safe-area padding, reduced-motion aware.
 * Colors come from tokens only.
 */
export function NavDrawer({ open, onClose, label, children, variant = "fullscreen" }: NavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  if (variant === "panel") {
    return (
      <>
        <div
          className="fixed inset-0 z-30 motion-reduce:transition-none"
          style={{ backgroundColor: "rgba(20, 18, 31, 0.35)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col p-5 shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text)",
            paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col transition-opacity duration-300 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{
        backgroundColor: "var(--color-dark)",
        color: "var(--color-surface)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
