"use client";

import Link from "next/link";
import { useState } from "react";
import { Images } from "lucide-react";
import { resolveMediaUrl } from "@/lib/url";
import Lightbox from "./Lightbox";
import { EmptyState } from "../../_components/EmptyState";

type Media = {
  id: number | string;
  caption?: string;
  file_url: string;
  media_type: string;
  category_name?: string;
  created_at?: string;
  original_filename?: string;
  uploader_name?: string | null;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso ?? "";
  }
}

function TileVisual({ m, src, title }: { m: Media; src: string; title: string }) {
  return (
    <span className="relative block aspect-[4/3] overflow-hidden" style={{ backgroundColor: "var(--color-background-deep)" }}>
      {m.media_type === "video" ? (
        <video src={src} preload="metadata" className="h-full w-full object-cover" />
      ) : (
        <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
      )}
      {m.media_type === "video" && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span
            className="flex h-10 w-10 items-center justify-center text-sm"
            style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
          >
            ▶
          </span>
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 hidden p-4 opacity-0 transition-opacity duration-200 motion-reduce:transition-none md:block md:group-hover/tile:opacity-100"
        style={{ background: "linear-gradient(to top, rgba(20, 18, 31, 0.75), transparent)", paddingTop: "var(--space-8)" }}
      >
        <span className="block truncate text-sm font-bold" style={{ color: "var(--color-surface)" }}>
          {title}
        </span>
        <span className="tokens-small mt-1 block" style={{ color: "rgba(255, 255, 255, 0.75)" }}>
          {m.category_name || "Uncategorized"} · {formatDate(m.created_at)}
        </span>
      </span>
    </span>
  );
}

export default function GalleryGrid({ media }: { media: Media[] }) {
  const [selected, setSelected] = useState<Media | null>(null);

  if (media.length === 0) {
    return (
      <EmptyState
        icon={<Images size={20} strokeWidth={1.5} aria-hidden="true" />}
        message="No media found. Try adjusting filters or share a memory."
        action={
          <Link href="/gallery/upload" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
            Upload media
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "var(--space-4)" }}>
        {media.map((m) => {
          const src = resolveMediaUrl(m.file_url);
          const title = m.caption || m.original_filename || `Media #${m.id}`;
          return (
            <button
              key={String(m.id)}
              type="button"
              onClick={() => setSelected(m)}
              aria-label={`Open ${title}`}
              className="group/tile block text-left transition-transform duration-200 ease-out motion-reduce:transition-none md:hover:-translate-y-0.5"
              style={{ borderRadius: "var(--radius-small)", overflow: "hidden" }}
            >
              <TileVisual m={m} src={src} title={title} />
              <span className="block md:hidden" style={{ paddingBlock: "var(--space-2)" }}>
                <span className="block truncate text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  {title}
                </span>
                <span className="tokens-small mt-0.5 block" style={{ color: "var(--color-muted)" }}>
                  {m.category_name || "Uncategorized"} · {formatDate(m.created_at)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Lightbox media={selected} onClose={() => setSelected(null)} />
    </>
  );
}
