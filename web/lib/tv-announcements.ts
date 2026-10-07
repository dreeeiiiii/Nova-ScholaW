export type TvAnnouncement = {
  id: number | string; title: string; content: string; type: string; status: string;
  image_url?: string | null; created_at: string; publish_at?: string | null;
  expires_at?: string | null; display_import?: boolean;
};
export async function loadTvAnnouncements(fetchPage: (offset: number) => Promise<{
  announcements: TvAnnouncement[]; total?: number;
}>): Promise<TvAnnouncement[]> {
  const rows: TvAnnouncement[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchPage(offset);
    const batch = page.announcements ?? [];
    rows.push(...batch);
    offset += batch.length;
    if (!batch.length || offset >= (page.total ?? offset)) break;
  }
  return [...new Map(rows.map(row => [String(row.id), row])).values()];
}
