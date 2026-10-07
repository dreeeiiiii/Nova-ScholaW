"use client";
/* eslint-disable @next/next/no-img-element -- Preoptimized NST WebP and signed B2 URLs use direct media delivery. */
import { resolveMediaUrl } from "@/lib/url";
import { nstImages } from "@/lib/nst-images";

export function AnnouncementVisual({ image, title }: { image?: string | null; title: string }) {
  if (!image) return null;
  return <figure className="announcement-visual">
    <img src={resolveMediaUrl(image)} alt={title} loading="lazy" decoding="async"
      onError={event => { if (!event.currentTarget.src.endsWith(nstImages.community.src.src)) event.currentTarget.src = nstImages.community.src.src; }} />
  </figure>;
}
