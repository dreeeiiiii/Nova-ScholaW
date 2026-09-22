import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/url";
import { Megaphone, CalendarDays, Images, Clock3, Monitor } from "lucide-react";

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
  // Report: stats.announcements has no scheduled field, so upcoming count comes from upcoming.total
  const statCards = isAdmin
    ? [
        {
          label: "Latest announcements",
          value: stats?.announcements.total ?? latest.length,
          icon: Megaphone,
          bg: "bg-[#d9efff]",
        },
        {
          label: "Upcoming events",
          value: upcomingResult.total ?? upcoming.length,
          icon: CalendarDays,
          bg: "bg-[#dff5e8]",
        },
        {
          label: "Gallery memories",
          value: stats?.gallery.approved ?? featured.length,
          icon: Images,
          bg: "bg-[#ffe1d1]",
        },
        {
          label: "Pending uploads",
          value: stats?.gallery.pending ?? 0,
          icon: Clock3,
          bg: "bg-[#e7defb]",
        },
      ]
    : [
        {
          label: "Announcements",
          value: latestResult.total ?? latest.length,
          icon: Megaphone,
          bg: "bg-[#d9efff]",
        },
        {
          label: "Upcoming events",
          value: upcomingResult.total ?? upcoming.length,
          icon: CalendarDays,
          bg: "bg-[#dff5e8]",
        },
        {
          label: "Featured memories",
          value: featuredResult.total ?? featured.length,
          icon: Images,
          bg: "bg-[#ffe1d1]",
        },
      ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="clay relative flex min-h-[240px] items-end overflow-hidden rounded-[2rem] bg-[#e7defb] p-7 sm:min-h-[330px] sm:p-10">
        <img
          src="https://images.pexels.com/photos/18587790/pexels-photo-18587790.jpeg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative max-w-xl">
          <span className="inline-block rounded-full bg-[#fff9f2] px-4 py-2 text-sm font-bold text-[#315c86]">
            NOVA SCHOLA TANAUAN
          </span>
          <h1 className="mt-5 font-heading text-2xl font-extrabold text-[#23344f]">Stay informed. Stay connected.</h1>
          <p className="mt-3 text-sm leading-6 text-[#3d4d66]">
            Welcome, {user.full_name} ({user.role}).
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Link
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#d9efff] px-5 py-2.5 text-sm font-bold text-[#315c86] min-h-[44px]"
          >
            <Monitor size={16} aria-hidden="true" />
            Open TV display
          </Link>
        </div>
      )}

      {/* At a glance */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-4 font-heading text-lg font-bold text-[#23344f] sm:text-xl">
          At a glance
        </h2>
        <div className={`grid gap-4 ${isAdmin ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`clay rounded-3xl p-5 ${card.bg}`}>
                <Icon size={24} className="mb-6 text-[#23344f]" />
                <p className="text-sm font-semibold text-[#315c86]">{card.label}</p>
                <p className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">{card.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column: Latest Announcements + Upcoming Events */}
      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="latest-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="latest-heading" className="font-heading text-lg font-bold text-[#23344f]">
              Latest Announcements
            </h2>
            <Link href="/announcements" className="inline-flex items-center text-sm font-bold text-[#315c86] underline min-h-[44px] px-2">
              Browse all
            </Link>
          </div>
          <div className="space-y-4">
            {latest.length === 0 ? (
              <div className="clay rounded-3xl bg-[#fdfaf3] p-6">
                <p className="text-sm text-text-muted">No announcements yet</p>
              </div>
            ) : (
              latest.map((a) => (
                <article key={String(a.id)} className="clay rounded-3xl bg-[#fdfaf3] p-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${a.type === "general" ? "bg-[#d9efff] text-[#23446c]" : "bg-[#e7defb] text-[#563d86]"}`}
                  >
                    {a.type === "general" ? "GENERAL" : "CLASS"}
                  </span>
                  <h3 className="mt-2 font-heading text-sm font-bold text-[#23344f]">{a.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-text-muted">{a.content}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-4 font-heading text-lg font-bold text-[#23344f]">
            Upcoming Events
          </h2>
          {upcoming.length === 0 ? (
            <div className="clay rounded-3xl bg-[#fdfaf3] p-6">
              <p className="text-sm text-text-muted">No scheduled events</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((ev) => {
                const dateStr = ev.publish_at
                  ? new Date(ev.publish_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : ev.created_at
                    ? new Date(ev.created_at).toLocaleDateString()
                    : "";
                return (
                  <article key={String(ev.id)} className="clay rounded-3xl bg-[#fff5ed] p-5">
                    <span className="text-xs font-bold text-[#8b5740]">{dateStr.toUpperCase()}</span>
                    <h3 className="mt-2 font-heading text-sm font-bold text-[#23344f]">{ev.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted">{ev.content}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Featured Gallery */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="featured-heading" className="font-heading text-lg font-bold text-[#23344f]">
                Featured Event Gallery
              </h2>
              <p className="mt-1 text-sm text-text-muted">A curated preview of school-event memories.</p>
            </div>
            <Link href="/gallery" className="rounded-full bg-[#d9efff] px-4 py-2 text-sm font-bold text-[#315c86]">
              Open gallery
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.slice(0, 4).map((m) => {
              const src = resolveMediaUrl(m.file_url);
              const alt = m.caption || "Featured gallery image";
              return (
                <div key={String(m.id)} className="clay overflow-hidden rounded-3xl">
                  {m.media_type === "video" ? (
                    <video src={src} preload="metadata" className="h-40 w-full object-cover md:h-48" />
                  ) : (
                    <img src={src} alt={alt} loading="lazy" className="h-40 w-full object-cover md:h-48" />
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
