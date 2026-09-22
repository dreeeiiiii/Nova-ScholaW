import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import AnnouncementList from "./_components/AnnouncementList";

type SearchParams = { type?: string; q?: string };
type Announcement = { id: number | string; title: string; content: string; type: string };

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
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold tracking-wide text-[#315c86]">OFFICIAL UPDATES</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Announcements</h1>
        </div>

        {error && (
          <div className="rounded-2xl bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {announcements.length === 0 ? (
            <div className="clay rounded-3xl bg-[#fdfaf3] p-6 md:col-span-2">
              <p className="text-sm text-text-muted">No announcements yet.</p>
            </div>
          ) : (
            announcements.map((a) => (
              <article key={String(a.id)} className="clay rounded-3xl bg-[#fdfaf3] p-6">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${a.type === "general" ? "bg-[#d9efff] text-[#23446c]" : "bg-[#e7defb] text-[#563d86]"}`}
                >
                  {a.type === "general" ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
                </span>
                <h3 className="mt-3 font-heading text-base font-bold text-[#23344f]">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">{a.content}</p>
              </article>
            ))
          )}
        </div>

        <div className="clay-card p-6 text-center">
          <p className="text-sm font-medium text-text-main">Sign in to see all announcements</p>
          <Link
            href="/login?from=%2Fannouncements"
            className="mt-3 inline-block rounded-full bg-[#315c86] px-6 py-2.5 text-sm font-bold text-white"
          >
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-wide text-[#315c86]">OFFICIAL UPDATES</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f] sm:text-3xl">Announcements</h1>
        </div>
        {(user.role === "admin" || user.role === "teacher") && (
          <Link
            href="/announcements/create"
            className="w-full rounded-full bg-[#315c86] px-5 py-3 text-sm font-bold text-white shadow min-h-[44px] flex items-center justify-center sm:w-auto"
          >
            Create announcement
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-2xl bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>
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
