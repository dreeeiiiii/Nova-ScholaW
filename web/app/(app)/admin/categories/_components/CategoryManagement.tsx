"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CategoryFormModal from "./CategoryFormModal";
import DeleteCategoryModal from "./DeleteCategoryModal";

type Category = { id: number | string; name: string; created_at?: string };

type Toast = { message: string; kind: "success" | "error" } | null;

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function CategoryManagement({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; category?: Category } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), kind === "success" ? 3000 : 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  function handleCreated(newCat: Category) {
    setCategories((prev) => [...prev, newCat]);
    showToast("Category created.", "success");
  }

  function handleRenamed(updated: Category) {
    setCategories((prev) => prev.map((c) => (String(c.id) === String(updated.id) ? updated : c)));
    showToast("Category renamed.", "success");
  }

  function handleDeleted(id: number | string) {
    setCategories((prev) => prev.filter((c) => String(c.id) !== String(id)));
    showToast("Category deleted.", "success");
  }

  function handleError(message: string, status?: number) {
    if (status === 409) {
      showToast("A category with this name already exists.", "error");
    } else {
      showToast(message, "error");
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
            toast.kind === "success" ? "bg-[#dff5e8] text-[#246044]" : "bg-[#ffe1d1] text-[#6b3d27]"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setFormState({ mode: "create" })}
          className="rounded-full bg-[#dff5e8] px-5 py-2 text-sm font-bold text-[#246044] hover:brightness-95"
        >
          Add category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
          <p className="text-sm font-medium text-[#23344f]">No categories yet</p>
        </div>
      ) : (
        <div className="clay overflow-hidden rounded-3xl bg-[#fdfaf3]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbf7ef] text-xs font-bold text-[#66758d]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={String(cat.id)} className="border-t border-[#f0e6d8]">
                    <td className="px-4 py-3 font-medium text-[#23344f]">{cat.name}</td>
                    <td className="px-4 py-3 text-xs text-[#66758d]">{formatDate(cat.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormState({ mode: "edit", category: cat })}
                          className="rounded-full bg-[#d9efff] px-3 py-1 text-xs font-bold text-[#23446c] hover:brightness-95"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          className="rounded-full bg-[#ffe1d1] px-3 py-1 text-xs font-bold text-[#6b3d27] hover:brightness-95"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formState && (
        <CategoryFormModal
          mode={formState.mode}
          initial={formState.category}
          onClose={() => setFormState(null)}
          onSaved={(cat) => {
            if (formState.mode === "create") handleCreated(cat);
            else handleRenamed(cat);
            setFormState(null);
          }}
          onError={handleError}
        />
      )}

      {deleteTarget && (
        <DeleteCategoryModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => {
            handleDeleted(id);
            setDeleteTarget(null);
          }}
          onError={handleError}
        />
      )}
    </div>
  );
}
