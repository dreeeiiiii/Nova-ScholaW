import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AnnouncementForm from "../_components/AnnouncementForm";
import { PageHeader } from "../../_components/PageHeader";

export default async function CreateAnnouncementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "teacher") redirect("/announcements");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Official updates"
        title="Create announcement"
        description="Publish a school-wide or class-targeted update."
        actions={
          <Link href="/announcements" className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm">
            &larr; Back to announcements
          </Link>
        }
      />
      <AnnouncementForm mode="create" />
    </div>
  );
}
