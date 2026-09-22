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
    <article className="clay rounded-3xl bg-[#fdfaf3] p-6">
      {announcement.image_url && (
        <img
          src={resolveMediaUrl(announcement.image_url)}
          alt={announcement.title}
          className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover"
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isGeneral ? "bg-[#d9efff] text-[#23446c]" : "bg-[#e7defb] text-[#563d86]"}`}>
          {isGeneral ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
        </span>
        {isGeneral && (announcement.show_on_tv ?? true) && (
          <span
            title="Shows on TV display"
            className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-[#315c86] ring-1 ring-[#d9efff]"
          >
            <Monitor size={12} aria-hidden="true" />
            TV
          </span>
        )}
      </div>
      <h3 className="mt-3 font-heading text-base font-bold text-[#23344f]">{announcement.title}</h3>
      {announcement.author_name && (
        <p className="mt-1 text-xs text-text-muted">By: {announcement.author_name}</p>
      )}
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">{announcement.content}</p>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpen(announcement.id)}
          className="text-sm font-bold text-[#315c86] underline"
        >
          Open details
        </button>
        {canModify && (
          <div className="flex items-center gap-3">
            <Link
              href={`/announcements/${encodeURIComponent(String(announcement.id))}/edit`}
              className="text-sm font-semibold text-text-muted hover:text-[#315c86]"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => onDelete?.(announcement.id, announcement.title)}
              className="text-sm font-semibold text-danger hover:text-danger/80"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
