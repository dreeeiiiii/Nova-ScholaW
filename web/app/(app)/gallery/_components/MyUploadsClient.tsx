"use client";

import { useState } from "react";
import Link from "next/link";
import { Images, Plus } from "lucide-react";
import { resolveMediaUrl } from "@/lib/url";
import Lightbox from "./Lightbox";
import { PageHeader } from "../../_components/PageHeader";
import { EmptyState } from "../../_components/EmptyState";

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
  const palette =
    status === "pending"
      ? { bg: "var(--color-warning-bg)", fg: "var(--color-warning)" }
      : status === "approved"
        ? { bg: "var(--color-success-bg)", fg: "var(--color-success)" }
        : status === "rejected"
          ? { bg: "var(--color-danger-bg)", fg: "var(--color-danger)" }
          : { bg: "var(--color-surface)", fg: "var(--color-muted)" };
  return (
    <span
      className="tokens-small shrink-0"
      style={{
        borderRadius: "var(--radius-pill)",
        padding: "2px var(--space-3)",
        fontWeight: 700,
        fontSize: "0.6875rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        backgroundColor: palette.bg,
        color: palette.fg,
      }}
    >
      {status}
    </span>
  );
}

export default function MyUploadsClient({ media, error }: { media: Media[]; error: string | null }) {
  const [selected, setSelected] = useState<Media | null>(null);

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Contributions" title="My uploads" />
        <div
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-small)",
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="Contributions"
          title="My uploads"
          description="Track the status of your submissions."
        />
        <EmptyState
          icon={<Images size={20} strokeWidth={1.5} aria-hidden="true" />}
          message="No uploads yet. Share a memory."
          action={
            <Link href="/gallery/upload" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              Upload media
            </Link>
          }
        />
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
    <div>
      <PageHeader
        eyebrow="Contributions"
        title="My uploads"
        description="Track the status of your submissions."
        actions={
          <Link href="/gallery/upload" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            Upload media
          </Link>
        }
      />

      {allGroups.map((group) => (
        <section key={group.label} aria-label={group.label} style={{ marginBottom: "var(--space-12)" }}>
          <h2 className="tokens-eyebrow" style={{ color: "var(--color-muted)", marginBottom: "var(--space-4)" }}>
            {group.label}
          </h2>
          <ul style={{ borderTop: "1px solid var(--color-line)" }}>
            {group.items.map((m) => {
              const title = m.caption?.trim() ? m.caption : m.original_filename || "Untitled upload";
              const src = resolveMediaUrl(m.file_url);
              const categoryLabel = m.category_name || (m.category_id ? `Category #${m.category_id}` : "Uncategorized");
              return (
                <li
                  key={String(m.id)}
                  className="flex min-h-[44px] gap-4"
                  style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(m)}
                    aria-label={`Open ${title}`}
                    className="block h-20 w-20 shrink-0 overflow-hidden"
                    style={{ backgroundColor: "var(--color-background-deep)" }}
                  >
                    {m.media_type === "video" ? (
                      <video src={src} preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => setSelected(m)}
                        className="truncate text-left text-sm font-bold"
                        style={{ color: "var(--color-text)", maxWidth: "100%" }}
                      >
                        {title}
                      </button>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="tokens-small mt-1" style={{ color: "var(--color-muted)" }}>
                      {categoryLabel} · {formatDate(m.created_at)}
                    </p>
                    {m.status === "rejected" && m.rejection_reason && (
                      <p
                        className="tokens-small mt-2"
                        style={{
                          borderRadius: "var(--radius-small)",
                          backgroundColor: "var(--color-danger-bg)",
                          color: "var(--color-danger)",
                          padding: "var(--space-2) var(--space-3)",
                        }}
                      >
                        <span className="font-bold">Reason:</span> {m.rejection_reason}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Lightbox media={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
