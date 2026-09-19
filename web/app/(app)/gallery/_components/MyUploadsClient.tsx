"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/url";
import Lightbox from "./Lightbox";

type Media = {
  id: number | string;
  file_url: string;
  media_type: string;
  caption?: string | null;
  original_filename?: string;
  category_id?: number | string | null;
  category_name?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  rejection_reason?: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "pending"
      ? "bg-[#fef3c7] text-[#92400e]"
      : status === "approved"
        ? "bg-success/15 text-success"
        : status === "rejected"
          ? "bg-danger/15 text-danger"
          : "bg-white text-text-muted";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${cls}`}>{status}</span>;
}

export default function MyUploadsClient({ media, error }: { media: Media[]; error: string | null }) {
  const [selected, setSelected] = useState<Media | null>(null);

  if (error) {
    return <div className="rounded-2xl bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>;
  }

  if (media.length === 0) {
    return (
      <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
        <p className="text-sm font-medium text-text-main">No uploads yet. Share a memory.</p>
        <p className="mt-1 text-xs text-text-muted">Your submissions will appear here after upload.</p>
        <Link
          href="/gallery/upload"
          className="mt-4 inline-block rounded-full bg-[#315c86] px-6 py-2.5 text-sm font-bold text-white"
        >
          Upload media
        </Link>
      </div>
    );
  }

  const pending = media.filter((m) => m.status === "pending");
  const rejected = media.filter((m) => m.status === "rejected");
  const approved = media.filter((m) => m.status === "approved");

  const groups: { label: string; items: Media[] }[] = [
    { label: `Pending (${pending.length})`, items: pending },
    { label: `Rejected (${rejected.length})`, items: rejected },
    { label: `Approved (${approved.length})`, items: approved },
  ].filter((g) => g.items.length > 0);

  // If no known status, fallback to single group
  const hasKnown = groups.length > 0;
  const fallbackGroup = hasKnown ? [] : [{ label: `All (${media.length})`, items: media }];

  const allGroups = hasKnown ? groups : fallbackGroup;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-[#23344f]">My uploads</h1>
        <p className="mt-1 text-sm text-text-muted">Track the status of your submissions.</p>
      </div>

      {allGroups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-text-muted">
            {group.label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((m) => {
              const title = m.caption?.trim() ? m.caption : m.original_filename || "Untitled upload";
              const src = resolveMediaUrl(m.file_url);
              const categoryLabel = m.category_name || (m.category_id ? `Category #${m.category_id}` : "Uncategorized");
              return (
                <div key={String(m.id)} className="clay overflow-hidden rounded-3xl bg-[#fdfaf3]">
                  <button
                    type="button"
                    onClick={() => setSelected(m)}
                    className="block w-full text-left focus:outline-none"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#fbf7ef]">
                      {m.media_type === "video" ? (
                        <div className="relative h-full w-full">
                          <video src={src} preload="metadata" className="h-full w-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">▶</span>
                          </span>
                        </div>
                      ) : (
                        <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                  </button>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-[#23344f]">{title}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {categoryLabel} · {formatDate(m.created_at)}
                    </p>
                    {m.status === "rejected" && m.rejection_reason && (
                      <div className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger">
                        <span className="font-bold">Reason:</span> {m.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <Lightbox media={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
