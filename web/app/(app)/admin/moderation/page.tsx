import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import ModerationTabs from "./_components/ModerationTabs";

type PendingMedia = {
  id: number | string;
  uploader_id: number | string;
  category_id: number | string;
  media_type: string;
  file_url: string;
  original_filename: string;
  caption: string | null;
  status: string;
  category_name: string | null;
  uploader_name: string | null;
  uploader_email: string | null;
  created_at: string;
};

export default async function ModerationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  let media: PendingMedia[] = [];
  let error: string | null = null;

  try {
    const data = (await serverFetch("/api/gallery/pending")) as { media: PendingMedia[] };
    media = data.media ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load pending media";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-sm font-bold text-[#315c86]">ROLE-AWARE WORKSPACE</span>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Admin Moderation</h1>
        </div>
        <span className="rounded-full bg-[#e7defb] px-3 py-2 text-xs font-bold text-[#563d86]">
          Admin view &middot; Prototype
        </span>
      </div>

      <div className="clay flex gap-3 rounded-3xl bg-[#ffe1d1] p-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 text-[#6b3d27]">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <p className="text-sm font-semibold text-[#6b3d27]">
          All announcements, uploads, approvals, and rejections are logged in this capstone prototype.
        </p>
      </div>

      <ModerationTabs initialPending={media} pendingError={error} />
    </div>
  );
}
