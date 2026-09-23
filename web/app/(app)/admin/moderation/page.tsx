import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import ModerationTabs from "./_components/ModerationTabs";
import { PageHeader } from "../../_components/PageHeader";
import { ShieldCheck } from "lucide-react";

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
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Admin Moderation"
        description="Review pending uploads before they go public."
        actions={
          <span
            className="tokens-small inline-flex min-h-[44px] items-center"
            style={{
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--color-line)",
              color: "var(--color-muted)",
              padding: "var(--space-2) var(--space-4)",
              fontWeight: 700,
            }}
          >
            Admin view · Prototype
          </span>
        }
      />

      <div
        className="flex gap-3"
        style={{
          borderRadius: "var(--radius-small)",
          backgroundColor: "var(--color-warning-bg)",
          padding: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <ShieldCheck size={20} strokeWidth={1.5} aria-hidden="true" className="shrink-0" style={{ color: "var(--color-warning)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--color-warning)" }}>
          All announcements, uploads, approvals, and rejections are logged in this capstone prototype.
        </p>
      </div>

      <ModerationTabs initialPending={media} pendingError={error} />
    </div>
  );
}
