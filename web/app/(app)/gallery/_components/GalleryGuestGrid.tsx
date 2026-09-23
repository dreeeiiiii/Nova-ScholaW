"use client";

import { Images } from "lucide-react";
import { resolveMediaUrl } from "@/lib/url";
import { EmptyState } from "../../_components/EmptyState";

type Media = {
  id: number | string;
  caption?: string;
  file_url: string;
  media_type: string;
  category_name?: string;
  created_at?: string;
  original_filename?: string;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso ?? "";
  }
}

export default function GalleryGuestGrid({ media }: { media: Media[] }) {
  if (media.length === 0) {
    return (
      <EmptyState
        icon={<Images size={20} strokeWidth={1.5} aria-hidden="true" />}
        message="No memories yet."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "var(--space-4)" }}>
      {media.map((m) => {
        const src = resolveMediaUrl(m.file_url);
        const title = m.caption || m.original_filename || `Media #${m.id}`;
        return (
          <figure key={String(m.id)} className="block" style={{ borderRadius: "var(--radius-small)", overflow: "hidden" }}>
            <span className="relative block aspect-[4/3] overflow-hidden" style={{ backgroundColor: "var(--color-background-deep)" }}>
              {m.media_type === "video" ? (
                <video src={src} preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
              )}
            </span>
            <figcaption style={{ paddingBlock: "var(--space-2)" }}>
              <span className="block truncate text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {title}
              </span>
              <span className="tokens-small mt-0.5 block" style={{ color: "var(--color-muted)" }}>
                {m.category_name || "Uncategorized"} · {formatDate(m.created_at)}
              </span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
