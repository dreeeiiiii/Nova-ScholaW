"use client";

import Link from "next/link";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  type: string;
  author_id?: number | string;
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
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isGeneral ? "bg-[#d9efff] text-[#23446c]" : "bg-[#e7defb] text-[#563d86]"}`}>
          {isGeneral ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
        </span>
      </div>
      <h3 className="mt-3 font-heading text-base font-bold text-[#23344f]">{announcement.title}</h3>
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
