import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import UploadForm from "../_components/UploadForm";
import { PageHeader } from "../../_components/PageHeader";

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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Contribute responsibly"
        title="Upload Event Image"
        description={user.role === "admin" ? "Upload a JPEG, PNG, or WebP event image directly to the public gallery." : "Upload a JPEG, PNG, or WebP event image for Administrator review."}
        actions={
          <Link href="/gallery" className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm">
            &larr; Back to gallery
          </Link>
        }
      />

      <UploadForm categories={categories} administrator={user.role === "admin"} />
    </div>
  );
}
