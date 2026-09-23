import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import AnnouncementList from "./_components/AnnouncementList";
import { PageHeader } from "../_components/PageHeader";
import { EmptyState } from "../_components/EmptyState";
import { Megaphone, Plus } from "lucide-react";

type SearchParams = { type?: string; q?: string };
type Announcement = { id: number | string; title: string; content: string; type: string };

function TypeBadge({ type }: { type: string }) {
  const isGeneral = type === "general";
  return (
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
  );
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  // Guest mode: capped preview via public tv endpoint
  if (!user) {
    let announcements: Announcement[] = [];
    let error: string | null = null;
    try {
      const data = (await serverFetch(`/api/announcements/tv`)) as { announcements: Announcement[] };
      announcements = (data.announcements ?? []).slice(0, 3);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load announcements";
    }

    return (
      <div>
        <PageHeader eyebrow="Official updates" title="Announcements" />

        {error && (
          <div
            className="tokens-small"
            style={{
              borderRadius: "var(--radius-small)",
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger)",
              padding: "var(--space-3) var(--space-4)",
              fontWeight: 600,
              marginBottom: "var(--space-6)",
            }}
          >
            {error}
          </div>
        )}

        {announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={20} strokeWidth={1.5} aria-hidden="true" />}
            message="No announcements yet."
          />
        ) : (
          <ul style={{ borderTop: "1px solid var(--color-line)" }}>
            {announcements.map((a) => (
              <li
                key={String(a.id)}
                className="flex min-h-[44px] flex-col gap-1"
                style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}
              >
                <TypeBadge type={a.type} />
                <span className="font-heading text-base font-bold" style={{ color: "var(--color-text)" }}>
                  {a.title}
                </span>
                <span className="tokens-small line-clamp-3" style={{ color: "var(--color-muted)" }}>
                  {a.content}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div
          className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            marginTop: "var(--space-8)",
            paddingBlock: "var(--space-8)",
            borderTop: "1px solid var(--color-line)",
            borderBottom: "1px solid var(--color-line)",
          }}
        >
          <p className="tokens-body" style={{ color: "var(--color-text)", fontWeight: 600 }}>
            Sign in to see all announcements
          </p>
          <Link href="/login?from=%2Fannouncements" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-6 !py-2 text-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const rawType = sp?.type;
  const type: "all" | "general" | "class" =
    rawType === "general" || rawType === "class" ? rawType : "all";
  const rawQ = typeof sp?.q === "string" ? sp.q.trim() : "";
  const q = rawQ || undefined;

  const query = new URLSearchParams();
  if (type !== "all") query.set("type", type);
  if (q) query.set("q", q);
  query.set("limit", "20");
  query.set("offset", "0");
  const qs = query.toString() ? `?${query.toString()}` : "";

  let announcements: unknown[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const data = (await serverFetch(`/api/announcements${qs}`)) as {
      announcements: unknown[];
      total: number;
    };
    announcements = data.announcements ?? [];
    total = data.total ?? 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load announcements";
    error = msg;
  }

  const canPublish = user.role === "admin" || user.role === "teacher";

  return (
    <div>
      <PageHeader
        eyebrow="Official updates"
        title="Announcements"
        description="School-wide and class-targeted updates, newest first."
        actions={
          canPublish ? (
            <Link href="/announcements/create" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              Create announcement
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-small)",
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 600,
            marginBottom: "var(--space-6)",
          }}
        >
          {error}
        </div>
      )}

      <AnnouncementList
        announcements={announcements as never[]}
        total={total}
        initialType={type}
        initialQ={q ?? ""}
        currentUser={user ? { id: user.id, role: user.role } : null}
      />
    </div>
  );
}
