import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/url";
import { Megaphone, CalendarDays, Monitor, Plus } from "lucide-react";
import { PageHeader } from "../_components/PageHeader";
import { EmptyState } from "../_components/EmptyState";
import { Statistics } from "@/app/_components/ui/Statistics";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  type: string;
  publish_at?: string | null;
  created_at?: string;
};

type GalleryMedia = {
  id: number | string;
  caption?: string;
  file_url: string;
  media_type: string;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Parallel fetches: latest, upcoming, featured (+ stats for admin)
  const [latestResult, upcomingResult, featuredResult, statsResult] = await Promise.all([
    serverFetch("/api/announcements?limit=3").catch(() => ({ announcements: [], total: 0 })) as Promise<{
      announcements: Announcement[];
      total: number;
    }>,
    serverFetch("/api/announcements?upcoming=true&limit=4").catch(() => ({ announcements: [], total: 0 })) as Promise<{
      announcements: Announcement[];
      total: number;
    }>,
    serverFetch("/api/gallery?featured=true&limit=4").catch(() => ({ media: [], total: 0 })) as Promise<{
      media: GalleryMedia[];
      total: number;
    }>,
    user.role === "admin"
      ? (serverFetch("/api/dashboard/stats").catch(() => null) as Promise<{
          users: { total: number; admin: number; teacher: number; student: number };
          announcements: { total: number; general: number; class: number };
          gallery: { total: number; pending: number; approved: number; rejected: number };
        } | null>)
      : Promise.resolve(null),
  ]);

  const latest = latestResult.announcements ?? [];
  const upcoming = upcomingResult.announcements ?? [];
  const featured = featuredResult.media ?? [];
  const stats = statsResult;

  // Stats values
  const isAdmin = user.role === "admin";
  const canPublish = user.role === "admin" || user.role === "teacher";
  // Report: stats.announcements has no scheduled field, so upcoming count comes from upcoming.total
  const statItems = isAdmin
    ? [
        { index: "01", label: "Announcements", value: stats?.announcements.total ?? latest.length },
        { index: "02", label: "Upcoming events", value: upcomingResult.total ?? upcoming.length },
        { index: "03", label: "Gallery memories", value: stats?.gallery.approved ?? featured.length },
        { index: "04", label: "Pending uploads", value: stats?.gallery.pending ?? 0 },
      ]
    : [
        { index: "01", label: "Announcements", value: latestResult.total ?? latest.length },
        { index: "02", label: "Upcoming events", value: upcomingResult.total ?? upcoming.length },
        { index: "03", label: "Featured memories", value: featuredResult.total ?? featured.length },
      ];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`Welcome back, ${user.full_name} — here's what's happening at Nova Schola Tanauan.`}
        actions={
          <>
            {canPublish && (
              <Link href="/announcements/create" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                Create announcement
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/tv"
                target="_blank"
                rel="noopener noreferrer"
                className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm"
              >
                <Monitor size={16} strokeWidth={1.5} aria-hidden="true" />
                Open TV display
              </Link>
            )}
          </>
        }
      />

      {/* Stats */}
      <section aria-label="At a glance" style={{ marginBottom: "var(--space-12)" }}>
        <Statistics items={statItems} columns={isAdmin ? 4 : 3} />
      </section>

      {/* Two-column: Latest Announcements + Upcoming Events */}
      <div className="grid gap-12 xl:grid-cols-2" style={{ marginBottom: "var(--space-12)" }}>
        <section aria-labelledby="latest-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="latest-heading" className="tokens-heading-3" style={{ color: "var(--color-text)" }}>
              Latest announcements
            </h2>
            <Link
              href="/announcements"
              className="group inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              Browse all
              <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
                &rarr;
              </span>
            </Link>
          </div>
          {latest.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={20} strokeWidth={1.5} aria-hidden="true" />}
              message="No announcements yet."
              action={
                <Link href="/announcements" className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                  Go to announcements &rarr;
                </Link>
              }
            />
          ) : (
            <ul style={{ borderTop: "1px solid var(--color-line)" }}>
              {latest.map((a) => (
                <li
                  key={String(a.id)}
                  className="flex min-h-[44px] flex-col gap-1"
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
                        backgroundColor: a.type === "general" ? "var(--color-info-bg)" : "var(--color-primary-soft)",
                        color: a.type === "general" ? "var(--color-info)" : "var(--color-primary-ink)",
                      }}
                    >
                      {a.type === "general" ? "GENERAL" : "CLASS"}
                    </span>
                    {(a.created_at || a.publish_at) && (
                      <span className="tokens-small" style={{ color: "var(--color-muted)" }}>
                        {formatDate(a.publish_at ?? a.created_at)}
                      </span>
                    )}
                  </span>
                  <span className="font-heading text-base font-bold" style={{ color: "var(--color-text)" }}>
                    {a.title}
                  </span>
                  <span className="tokens-small line-clamp-2" style={{ color: "var(--color-muted)" }}>
                    {a.content}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="tokens-heading-3 mb-4" style={{ color: "var(--color-text)" }}>
            Upcoming events
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={20} strokeWidth={1.5} aria-hidden="true" />}
              message="No scheduled events."
            />
          ) : (
            <ul style={{ borderTop: "1px solid var(--color-line)" }}>
              {upcoming.map((ev) => {
                const dateStr = formatDate(ev.publish_at ?? ev.created_at ?? null);
                return (
                  <li
                    key={String(ev.id)}
                    className="flex min-h-[44px] gap-4"
                    style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}
                  >
                    <span
                      className="tokens-small shrink-0"
                      style={{ color: "var(--color-muted)", fontWeight: 700, minWidth: "88px", paddingTop: "2px" }}
                    >
                      {dateStr.toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="font-heading block truncate text-base font-bold" style={{ color: "var(--color-text)" }}>
                        {ev.title}
                      </span>
                      <span className="tokens-small line-clamp-2" style={{ color: "var(--color-muted)" }}>
                        {ev.content}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Featured Gallery */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="featured-heading" className="tokens-heading-3" style={{ color: "var(--color-text)" }}>
                Featured gallery
              </h2>
              <p className="tokens-small mt-1" style={{ color: "var(--color-muted)" }}>
                A curated preview of school-event memories.
              </p>
            </div>
            <Link
              href="/gallery"
              className="group inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              Open gallery
              <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
                &rarr;
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {featured.slice(0, 3).map((m) => {
              const src = resolveMediaUrl(m.file_url);
              const alt = m.caption || "Featured gallery image";
              return (
                <div key={String(m.id)} className="overflow-hidden" style={{ borderRadius: "var(--radius-medium)" }}>
                  {m.media_type === "video" ? (
                    <video src={src} preload="metadata" className="h-40 w-full object-cover md:h-56" />
                  ) : (
                    <img src={src} alt={alt} loading="lazy" className="h-40 w-full object-cover md:h-56" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
