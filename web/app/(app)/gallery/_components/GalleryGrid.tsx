"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/url";
import Lightbox from "./Lightbox";

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

export default function GalleryGrid({ media }: { media: Media[] }) {
  const [selected, setSelected] = useState<Media | null>(null);

  if (media.length === 0) {
    return (
      <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
        <p className="text-sm text-text-muted">No media found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((m) => {
          const src = resolveMediaUrl(m.file_url);
          const title = m.caption || m.original_filename || `Media #${m.id}`;
          return (
            <button
              key={String(m.id)}
              type="button"
              onClick={() => setSelected(m)}
              className="clay overflow-hidden rounded-3xl bg-[#fdfaf3] text-left transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#315c86]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#fbf7ef]">
                {m.media_type === "video" ? (
                  <video src={src} preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
                )}
                {m.media_type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">▶</span>
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-bold text-[#23344f]">{title}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {m.category_name || "Uncategorized"} · {formatDate(m.created_at)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Lightbox media={selected} onClose={() => setSelected(null)} />
    </>
  );
}
