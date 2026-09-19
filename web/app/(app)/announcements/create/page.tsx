import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AnnouncementForm from "../_components/AnnouncementForm";

export default async function CreateAnnouncementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "teacher") redirect("/announcements");

  return (
    <div className="mx-auto max-w-3xl">
      <AnnouncementForm mode="create" />
    </div>
  );
}
