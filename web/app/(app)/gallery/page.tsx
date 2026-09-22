import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import GalleryClient from "./_components/GalleryClient";
import GalleryGuestGrid from "./_components/GalleryGuestGrid";

type SearchParams = { q?: string; category_id?: string; year?: string; media_type?: string };
type Category = { id: number | string; name: string };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const category_id = typeof sp?.category_id === "string" ? sp.category_id.trim() : "";
  const year = typeof sp?.year === "string" ? sp.year.trim() : "";
  const media_type = typeof sp?.media_type === "string" ? sp.media_type.trim() : "";

  // Parallel fetches: categories + gallery + mine (if authed)
  const galleryQuery = new URLSearchParams();
  if (q) galleryQuery.set("q", q);
  if (category_id) galleryQuery.set("category_id", category_id);
  if (year) galleryQuery.set("year", year);
  if (media_type) galleryQuery.set("media_type", media_type);
  galleryQuery.set("limit", user ? "20" : "6");
  galleryQuery.set("offset", "0");

  const galleryPath = q ? `/api/gallery/search?${galleryQuery.toString()}` : `/api/gallery?${galleryQuery.toString() ? `?${galleryQuery.toString()}` : ""}`;

  const [categoriesRes, mediaRes, mineRes] = await Promise.all([
    serverFetch("/api/categories").catch(() => ({ categories: [] })) as Promise<{ categories: Category[] }>,
    user
      ? (serverFetch(galleryPath).catch(() => ({ media: [], total: 0 })) as Promise<{ media: unknown[]; total: number }>)
      : (serverFetch("/api/gallery?limit=6").catch(() => ({ media: [] })) as Promise<{ media: unknown[] }>),
    user
      ? (serverFetch("/api/gallery/mine").catch(() => ({ media: [] })) as Promise<{ media: Array<{ status: string }> }>)
      : Promise.resolve({ media: [] } as { media: Array<{ status: string }> }),
  ]);

  const categories = (categoriesRes as { categories: Category[] }).categories ?? [];

  // Guest: capped grid 6 items, no filters
  // This is a UX funnel, not a security boundary.
  if (!user) {
    const guestMedia = (mediaRes as { media: unknown[] }).media ?? [];
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold tracking-wide text-[#315c86]">SEARCHABLE MEMORIES</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Event Gallery</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            A curated preview of school-event memories. Sign in to search and filter the full archive.
          </p>
        </div>

        <GalleryGuestGrid media={guestMedia as never[]} />

        <div className="clay-card p-6 text-center">
          <p className="text-sm font-medium text-text-main">Sign in to browse all memories</p>
          <p className="mt-1 text-xs text-text-muted">Search by category, year, and media type</p>
          <Link
            href="/login?from=%2Fgallery"
            className="mt-4 inline-block rounded-full bg-[#315c86] px-6 py-2.5 text-sm font-bold text-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated: full gallery with filters
  const mediaData = mediaRes as { media: unknown[]; total?: number };
  const media: unknown[] = (mediaData.media ?? []) as unknown[];
  const total: number = (mediaData.total ?? 0) as number;
  const error: string | null = null;

  let pendingCount = 0;
  let rejectedCount = 0;
  const mineData = mineRes as { media: Array<{ status: string }> };
  const mine = mineData.media ?? [];
  pendingCount = mine.filter((m) => m.status === "pending").length;
  rejectedCount = mine.filter((m) => m.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold tracking-wide text-[#315c86]">SEARCHABLE MEMORIES</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Event Gallery</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          Browse approved photos and videos from school events. Use search and filters to find memories.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>
      )}

      <GalleryClient
        media={media as never[]}
        total={total}
        categories={categories}
        initialQ={q}
        initialCategory={category_id}
        initialYear={year}
        initialMediaType={media_type as never}
        pendingCount={pendingCount}
        rejectedCount={rejectedCount}
      />
    </div>
  );
}
