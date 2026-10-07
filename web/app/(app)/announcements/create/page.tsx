import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AnnouncementForm from "../_components/AnnouncementForm";
import { PageHeader } from "../../_components/PageHeader";

export default async function CreateAnnouncementPage({searchParams}:{searchParams:Promise<{type?:string;department_id?:string}>}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "teacher") redirect("/announcements");

  const sp=await searchParams;
  const initial=user.role==="admin"&&sp.type==="department"?{type:"department",department_id:sp.department_id}:undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Official updates"
        title="Create announcement"
        description={user.role === "teacher" ? "Publish a Class Announcement to intended Students." : "Publish a General or Department Announcement."}
        actions={
          <Link href="/announcements" className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm">
            &larr; Back to announcements
          </Link>
        }
      />
      <AnnouncementForm mode="create" role={user.role} initial={initial} />
    </div>
  );
}
