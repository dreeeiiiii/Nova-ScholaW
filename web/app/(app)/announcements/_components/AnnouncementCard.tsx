"use client";

import Link from "next/link";
import { Monitor } from "lucide-react";
import { resolveMediaUrl } from "@/lib/url";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  type: string;
  author_id?: number | string;
  author_name?: string | null;
  image_url?: string | null;
  show_on_tv?: boolean;
  created_at?: string;
};

type CurrentUser = {
  id: number | string;
  role: string;
};

export default function AnnouncementCard({
  announcement,
  onOpen,
  currentUser,
  onDelete,
}: {
  announcement: Announcement;
  onOpen: (id: number | string) => void;
  currentUser?: CurrentUser | null;
  onDelete?: (id: number | string, title: string) => void;
}) {
  const isGeneral = announcement.type === "general";
  const canModify =
    !!currentUser &&
    (currentUser.role === "admin" || String(announcement.author_id) === String(currentUser.id));

  return (
    <li
      className="flex min-h-[44px] flex-col gap-2"
      style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}
    >
      <span className="flex flex-wrap items-center gap-3">
        <span
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-pill)",
            padding: "2px var(--space-3)",
            fontWeight: 700,
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
            backgroundColor: isGeneral ? "var(--color-info-bg)" : "var(--color-primary-soft)",
            color: isGeneral ? "var(--color-info)" : "var(--color-primary-ink)",
          }}
        >
          {isGeneral ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
        </span>
        {isGeneral && (announcement.show_on_tv ?? true) && (
          <span
            title="Shows on TV display"
            className="inline-flex items-center gap-1"
            style={{
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              padding: "2px var(--space-2)",
              fontSize: "0.625rem",
              fontWeight: 700,
              color: "var(--color-muted)",
            }}
          >
            <Monitor size={12} aria-hidden="true" />
            TV
          </span>
        )}
        {announcement.author_name && (
          <span className="tokens-small" style={{ color: "var(--color-muted)" }}>
            By {announcement.author_name}
          </span>
        )}
        {announcement.created_at && (
          <span className="tokens-small" style={{ color: "var(--color-muted)" }}>
            {new Date(announcement.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </span>
      {announcement.image_url && (
        <img
          src={resolveMediaUrl(announcement.image_url)}
          alt={announcement.title}
          loading="lazy"
          className="aspect-[16/9] w-full object-cover sm:max-w-xs"
          style={{ borderRadius: "var(--radius-small)" }}
        />
      )}
      <span className="font-heading text-base font-bold" style={{ color: "var(--color-text)" }}>
        {announcement.title}
      </span>
      <span className="tokens-small line-clamp-3" style={{ color: "var(--color-muted)" }}>
        {announcement.content}
      </span>
      <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <button
          type="button"
          onClick={() => onOpen(announcement.id)}
          className="inline-flex min-h-[44px] items-center text-sm font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          Open details
        </button>
        {canModify && (
          <>
            <Link
              href={`/announcements/${encodeURIComponent(String(announcement.id))}/edit`}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold"
              style={{ color: "var(--color-muted)" }}
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => onDelete?.(announcement.id, announcement.title)}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold"
              style={{ color: "var(--color-danger)" }}
            >
              Delete
            </button>
          </>
        )}
      </span>
    </li>
  );
}
