import { serverFetch } from "@/lib/api";
import { loadTvAnnouncements, type TvAnnouncement } from "@/lib/tv-announcements";
import TvSlideshow from "./_components/TvSlideshow";

export default async function TvPage({ searchParams }: {
  searchParams?: Promise<{ animate?: string }>;
}) {
  let announcements: TvAnnouncement[] = [];
  try {
    announcements = await loadTvAnnouncements(async offset =>
      await serverFetch("/api/announcements/tv?limit=100&offset=" + offset) as {
        announcements: TvAnnouncement[]; total?: number;
      });
  } catch { announcements = []; }
  const sp = searchParams ? await searchParams : {};
  const raw = typeof sp.animate === "string" ? sp.animate.toLowerCase().trim() : "";
  return <main id="main-content" tabIndex={-1}><TvSlideshow initialAnnouncements={announcements}
    animate={!["0", "off", "false"].includes(raw)} /></main>;
}
