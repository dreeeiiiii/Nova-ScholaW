import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import UploadForm from "../_components/UploadForm";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // All logged-in roles can upload (admin, teacher, student)
  let categories: { id: number | string; name: string }[] = [];
  try {
    const data = (await serverFetch("/api/categories")) as { categories: { id: number | string; name: string }[] };
    categories = data.categories ?? [];
  } catch {
    categories = [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-bold tracking-wide text-[#315c86]">CONTRIBUTE RESPONSIBLY</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Upload event media</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Share a school-event memory for admin review and category approval.
        </p>
      </div>

      <UploadForm categories={categories} />
    </div>
  );
}
