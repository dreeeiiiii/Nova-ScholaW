import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import AnnouncementForm from "../../_components/AnnouncementForm";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  let data: {
    announcement: {
      id: number | string;
      title: string;
      content: string;
      type: string;
      image_url?: string | null;
      publish_at?: string | null;
      expires_at?: string | null;
      author_id?: number | string;
    };
    targets: Array<{
      target_type: string;
      section_id?: number | null;
      course_id?: number | null;
      student_id?: number | null;
    }>;
  } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data = (await serverFetch(`/api/announcements/${encodeURIComponent(id)}`)) as any;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = (e as { status?: number })?.status;
    if (status === 404) notFound();
    if (status === 403) redirect("/announcements");
    if (msg.includes("not found")) notFound();
    redirect("/announcements");
  }

  if (!data || !data.announcement) notFound();

  const announcement = data.announcement;
  const targets = data.targets ?? [];

  // Defense in depth: teacher can only edit own
  if (user.role === "teacher" && String(announcement.author_id) !== String(user.id)) {
    redirect("/announcements");
  }
  if (user.role === "student") redirect("/announcements");

  const section_ids = targets
    .filter((t: { target_type: string; section_id?: number | null }) => t.target_type === "section" && t.section_id)
    .map((t: { section_id?: number | null }) => t.section_id as number);
  const course_ids = targets
    .filter((t: { target_type: string; course_id?: number | null }) => t.target_type === "course" && t.course_id)
    .map((t: { course_id?: number | null }) => t.course_id as number);
  const student_ids = targets
    .filter((t: { target_type: string; student_id?: number | null }) => t.target_type === "student" && t.student_id)
    .map((t: { student_id?: number | null }) => t.student_id as number);

  const initial = {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    image_url: announcement.image_url ?? undefined,
    publish_at: announcement.publish_at ?? null,
    expires_at: announcement.expires_at ?? null,
    targets: { section_ids, course_ids, student_ids },
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AnnouncementForm mode="edit" initial={initial} />
    </div>
  );
}
