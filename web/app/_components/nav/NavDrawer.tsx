"use client";
import { useEffect, useRef } from "react";
type NavDrawerProps = { open: boolean; onClose: () => void; label: string; children: React.ReactNode; variant?: "fullscreen" | "panel" };
/** Native modal dialog supplies focus containment, inert background, and focus restoration. */
export function NavDrawer({ open, onClose, label, children, variant = "fullscreen" }: NavDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) { dialog.close(); return; }
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <dialog ref={ref} aria-label={label} aria-modal="true" onCancel={onClose} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length > 0);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} className={`nav-dialog nav-dialog-${variant}`}>
    <div className="nav-dialog-content">{children}</div>
  </dialog>;
}
