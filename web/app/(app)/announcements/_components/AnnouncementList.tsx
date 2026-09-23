"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementDetailModal from "./AnnouncementDetailModal";
import DeleteAnnouncementModal from "./DeleteAnnouncementModal";
import { EmptyState } from "../../_components/EmptyState";
import { Megaphone } from "lucide-react";

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

const TABS = [
  { key: "all", label: "All" },
  { key: "general", label: "General" },
  { key: "class", label: "Class" },
] as const;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setQ(initialQ);
  }, [initialQ]);

  // Clear the optimistic pill once the server confirms the new filter
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <label className="sr-only" htmlFor="announcement-search">
            Search announcements
          </label>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-muted)" }}
          />
          <input
            id="announcement-search"
            type="search"
            placeholder="Search announcements"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-token"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
        <div
          className="flex gap-6"
          role="tablist"
          aria-label="Filter by type"
          style={{ borderBottom: "1px solid var(--color-line)" }}
        >
          {TABS.map((tab) => {
            const isActive = activeType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTypeClick(tab.key)}
                className="inline-flex min-h-[44px] items-center text-sm font-bold transition-colors duration-200 motion-reduce:transition-none"
                style={{
                  color: isActive ? "var(--color-text)" : "var(--color-muted)",
                  boxShadow: isActive ? "inset 0 -2px 0 var(--color-primary)" : "none",
                  paddingInline: "2px",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p className="tokens-small" style={{ color: "var(--color-muted)" }}>
          {total} result{total === 1 ? "" : "s"}
        </p>
        {isPending && (
          <span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }} role="status" aria-live="polite">
            <span
              className="inline-block h-2 w-2 animate-pulse"
              aria-hidden="true"
              style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-primary)" }}
            />
            Updating…
          </span>
        )}
      </div>

      <div
        className="transition-opacity duration-200 motion-reduce:transition-none"
        style={{ marginTop: "var(--space-4)", opacity: isPending ? 0.6 : 1 }}
        aria-busy={isPending}
      >
        {announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={20} strokeWidth={1.5} aria-hidden="true" />}
            message="No announcements found."
          />
        ) : (
          <ul style={{ borderTop: "1px solid var(--color-line)" }}>
            {announcements.map((a) => (
              <AnnouncementCard
                key={String(a.id)}
                announcement={a}
                onOpen={setSelectedId}
                currentUser={currentUser ?? undefined}
                onDelete={(id, title) => setDeleteTarget({ id, title })}
              />
            ))}
          </ul>
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
