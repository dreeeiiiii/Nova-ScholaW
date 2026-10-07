import { serverFetch } from "@/lib/api";
import TvSlideshow from "./_components/TvSlideshow";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  type?: string;
  publish_at?: string | null;
  expires_at?: string | null;
};

export default async function TvPage({
  searchParams,
}: {
  searchParams?: Promise<{ animate?: string }>;
}) {
  let announcements: Announcement[] = [];
  try {
    const data = (await serverFetch("/api/announcements/tv")) as { announcements: Announcement[] };
    announcements = data.announcements ?? [];
  } catch {
    announcements = [];
  }

  const sp = searchParams ? await searchParams : {};
  const raw = typeof sp.animate === "string" ? sp.animate.toLowerCase().trim() : "";
  const animate = !(raw === "0" || raw === "off" || raw === "false");

  return <main id="main-content" tabIndex={-1}><TvSlideshow initialAnnouncements={announcements} animate={animate} /></main>;
}
