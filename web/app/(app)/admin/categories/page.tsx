import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch, ApiError } from "@/lib/api";
import CategoryManagement from "./_components/CategoryManagement";

type Category = { id: number | string; name: string; created_at?: string };

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  let categories: Category[] = [];
  let error: string | null = null;

  try {
    const data = (await serverFetch("/api/categories")) as { categories?: Category[] };
    categories = data.categories ?? [];
  } catch (e) {
    error = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load categories";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-sm font-bold text-[#315c86]">GALLERY</span>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Categories</h1>
          <p className="mt-2 text-sm text-[#66758d]">
            Manage gallery categories. Deleting a category clears it from media without deleting the media.
          </p>
        </div>
        <div className="rounded-2xl bg-[#ffe1d1] px-4 py-3 text-sm font-medium text-[#6b3d27]">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm font-bold text-[#315c86]">GALLERY</span>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Categories</h1>
        <p className="mt-2 text-sm text-[#66758d]">
          Manage gallery categories. Deleting a category clears it from media without deleting the media.
        </p>
      </div>

      <CategoryManagement initialCategories={categories} />
    </div>
  );
}
