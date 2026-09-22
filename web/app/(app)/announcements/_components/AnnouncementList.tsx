"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementDetailModal from "./AnnouncementDetailModal";
import DeleteAnnouncementModal from "./DeleteAnnouncementModal";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  type: string;
  status?: string;
  created_at: string;
  author_id?: number | string;
};

type Props = {
  announcements: Announcement[];
  total: number;
  initialType: "all" | "general" | "class";
  initialQ: string;
  currentUser?: { id: number | string; role: string } | null;
};

export default function AnnouncementList({ announcements, total, initialType, initialQ, currentUser }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number | string; title: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticType, setOptimisticType] = useState<"all" | "general" | "class" | null>(null);

  // Keep local q in sync when URL changes (e.g., back/forward)
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  // Clear the optimistic pill once the server confirms the new filter
  useEffect(() => {
    setOptimisticType(null);
  }, [initialType]);

  // Debounced update of URL ?q
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      // keep type if present
      if (initialType !== "all") params.set("type", initialType);
      // reset offset/pagination if any
      params.delete("offset");
      // No change — bail out so a stale timeout can't clobber the URL
      // or ping-pong the router with identical navigations
      if (params.toString() === searchParams.toString()) return;
      startTransition(() => {
        router.replace(`?${params.toString()}`);
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, router, searchParams, initialType]);

  function onTypeClick(next: "all" | "general" | "class") {
    setOptimisticType(next);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("type");
      else params.set("type", next);
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      params.delete("offset");
      router.replace(`?${params.toString()}`);
    });
  }

  const activeType = optimisticType ?? initialType;

  return (
    <div>
      <div className="clay flex flex-col gap-3 rounded-3xl bg-[#fdfaf3] p-4 sm:p-6 md:flex-row">
        <label className="sr-only" htmlFor="announcement-search">
          Search announcements
        </label>
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 shadow-[inset_4px_4px_9px_#d5d2cb,inset_-4px_-4px_9px_#fffdf7] min-h-[44px]">
          <Search size={16} className="text-text-muted" />
          <input
            id="announcement-search"
            type="search"
            placeholder="Search announcements"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent p-3 text-sm outline-none placeholder:text-text-muted min-h-[44px]"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "general", label: "General" },
            { key: "class", label: "Class" },
          ].map((pill) => {
            const isActive = activeType === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => onTypeClick(pill.key as never)}
                className={`rounded-full px-4 py-2.5 text-sm font-bold min-h-[44px] ${isActive ? "bg-[#d9efff] text-[#23446c] ring-2 ring-[#315c86]" : "bg-[#e7defb] text-[#563d86]"}`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p className="text-xs text-text-muted">{total} result{total === 1 ? "" : "s"}</p>
        {isPending && (
          <span className="inline-flex items-center gap-2 text-xs text-text-muted" role="status" aria-live="polite">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#315c86]" aria-hidden="true" />
            Updating…
          </span>
        )}
      </div>

      <div className={`mt-4 grid gap-5 transition-opacity md:grid-cols-2 ${isPending ? "opacity-60" : ""}`} aria-busy={isPending}>
        {announcements.length === 0 ? (
          <div className="clay rounded-3xl bg-[#fdfaf3] p-6 md:col-span-2">
            <p className="text-sm text-text-muted">No announcements found.</p>
          </div>
        ) : (
          announcements.map((a) => (
            <AnnouncementCard
              key={String(a.id)}
              announcement={a}
              onOpen={setSelectedId}
              currentUser={currentUser ?? undefined}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
            />
          ))
        )}
      </div>

      <AnnouncementDetailModal openId={selectedId} onClose={() => setSelectedId(null)} />
      {deleteTarget && (
        <DeleteAnnouncementModal
          announcementId={deleteTarget.id}
          announcementTitle={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
