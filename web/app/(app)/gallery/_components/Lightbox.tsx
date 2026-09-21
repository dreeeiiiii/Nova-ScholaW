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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="clay max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-[#fdfaf3] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#23344f]">{title}</h2>
            <p className="mt-1 text-xs text-text-muted">
              {media.category_name || "Uncategorized"}
              {media.created_at ? ` · ${new Date(media.created_at).toLocaleString()}` : ""}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl bg-white p-2 shadow focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {media.media_type === "video" ? (
          <video src={src} controls className="max-h-[70vh] w-full rounded-2xl bg-black" />
        ) : (
          <img src={src} alt={title} className="max-h-[70vh] w-full rounded-2xl object-contain bg-white" />
        )}

        {media.caption && <p className="mt-4 text-sm leading-relaxed text-text-main">{media.caption}</p>}
      </div>
    </div>
  );
}
