"use client";

import Link from "next/link";
import { Monitor } from "lucide-react";
import { AnnouncementVisual } from "@/app/_components/ui/AnnouncementVisual";

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
  publish_at?: string | null;
  display_import_key?: string | null;
  status?: string;
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
    ((currentUser.role === "admin" && announcement.type !== "class") || (currentUser.role === "teacher" && announcement.type === "class" && String(announcement.author_id) === String(currentUser.id)));

  return (
    <li
      className="announcement-card flex min-h-[44px] flex-col gap-3"
    >
      <AnnouncementVisual image={announcement.image_url} title={announcement.title} />
      <span className="flex flex-wrap items-center gap-3">
        <span
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-pill)",
            padding: "2px var(--space-3)",
            fontWeight: 700,
            fontSize: "var(--text-small)",
            letterSpacing: "0.08em",
            backgroundColor: isGeneral ? "var(--color-info-bg)" : "var(--color-primary-soft)",
            color: isGeneral ? "var(--color-info)" : "var(--color-primary-ink)",
          }}
        >
          {isGeneral ? "GENERAL · PUBLIC" : announcement.type === "department" ? "DEPARTMENT · PRIVATE" : "CLASS · PRIVATE"}
        </span>
        {isGeneral && announcement.status === "published" && (
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
        {announcement.display_import_key && <span className="tokens-small">Demo display · Email excluded</span>}
        {announcement.status && <span className="tokens-small capitalize">{announcement.status}</span>}
        {announcement.created_at && !(announcement.display_import_key && !announcement.publish_at) && (
          <span className="tokens-small" style={{ color: "var(--color-muted)" }}>
            {new Date(announcement.publish_at ?? announcement.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </span>
      <h2 className="announcement-title font-heading font-bold" style={{ color: "var(--color-text)" }}>
        {announcement.title}
      </h2>
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
              Archive
            </button>
          </>
        )}
      </span>
    </li>
  );
}
