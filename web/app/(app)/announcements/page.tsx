import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import AnnouncementList from "./_components/AnnouncementList";

type SearchParams = { type?: string; q?: string };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
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
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Announcements</h1>
        </div>
        {(user?.role === "admin" || user?.role === "teacher") && (
          <span
            title="Create flow coming in Phase 4"
            className="rounded-full bg-[#315c86] px-5 py-3 text-sm font-bold text-white opacity-60"
          >
            Create announcement
          </span>
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
        userRole={user?.role ?? "student"}
      />
    </div>
  );
}
