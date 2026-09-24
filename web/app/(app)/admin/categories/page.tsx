import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch, ApiError } from "@/lib/api";
import CategoryManagement from "./_components/CategoryManagement";
import { PageHeader } from "../../_components/PageHeader";

type Category = { id: number | string; name: string; created_at?: string };

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "teacher") redirect("/dashboard");

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
      <div>
        <PageHeader
          eyebrow="Gallery"
          title="Categories"
          description="Manage gallery categories. Deleting a category clears it from media without deleting the media."
        />
        <div
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-small)",
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gallery"
        title="Categories"
        description="Manage gallery categories. Deleting a category clears it from media without deleting the media."
      />

      <CategoryManagement initialCategories={categories} canDelete={user.role === "admin"} />
    </div>
  );
}
