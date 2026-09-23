"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { resolveMediaUrl } from "@/lib/url";

type Media = {
  id: number | string;
  caption?: string | null;
  file_url: string;
  media_type: string;
  category_name?: string | null;
  created_at?: string;
  original_filename?: string | null;
};

export default function Lightbox({ media, onClose }: { media: Media | null; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!media) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [media]);

  useEffect(() => {
    if (!media) return;
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
  }, [media, onClose]);

  if (!media) return null;

  const src = resolveMediaUrl(media.file_url);
  const title = media.caption || media.original_filename || `Media #${media.id}`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 90%, transparent)" }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold" style={{ color: "var(--color-surface)" }}>{title}</h2>
            <p className="tokens-small mt-1" style={{ color: "rgba(255, 255, 255, 0.65)" }}>
              {media.category_name || "Uncategorized"}
              {media.created_at ? ` · ${new Date(media.created_at).toLocaleString()}` : ""}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors duration-200 motion-reduce:transition-none"
            style={{ borderRadius: "var(--radius-pill)", border: "1px solid rgba(255,255,255,0.25)", color: "var(--color-surface)" }}
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {media.media_type === "video" ? (
          <video src={src} controls className="max-h-[70vh] w-full bg-black" />
        ) : (
          <img src={src} alt={title} className="max-h-[70vh] w-full object-contain" />
        )}

        {media.caption && <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.8)" }}>{media.caption}</p>}
      </div>
    </div>
  );
}
