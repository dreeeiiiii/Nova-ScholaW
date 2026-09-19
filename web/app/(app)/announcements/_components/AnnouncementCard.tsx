"use client";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  type: string;
};

export default function AnnouncementCard({
  announcement,
  onOpen,
}: {
  announcement: Announcement;
  onOpen: (id: number | string) => void;
}) {
  const isGeneral = announcement.type === "general";
  return (
    <article className="clay rounded-3xl bg-[#fdfaf3] p-6">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isGeneral ? "bg-[#d9efff] text-[#23446c]" : "bg-[#e7defb] text-[#563d86]"}`}>
          {isGeneral ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
        </span>
      </div>
      <h3 className="mt-3 font-heading text-base font-bold text-[#23344f]">{announcement.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">{announcement.content}</p>
      <button
        type="button"
        onClick={() => onOpen(announcement.id)}
        className="mt-3 text-sm font-bold text-[#315c86] underline"
      >
        Open details
      </button>
    </article>
  );
}
