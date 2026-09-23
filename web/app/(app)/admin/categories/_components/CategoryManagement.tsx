"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tags, Plus } from "lucide-react";
import CategoryFormModal from "./CategoryFormModal";
import DeleteCategoryModal from "./DeleteCategoryModal";
import { EmptyState } from "../../../_components/EmptyState";

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
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
    <div>
      {toast && (
        <div
          className="tokens-small inline-flex items-center gap-2 font-semibold"
          style={{
            borderRadius: "var(--radius-small)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: toast.kind === "success" ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            color: toast.kind === "success" ? "var(--color-success)" : "var(--color-danger)",
            marginBottom: "var(--space-4)",
          }}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-end" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          onClick={() => setFormState({ mode: "create" })}
          className="tokens-btn tokens-btn-primary w-full !min-h-[44px] !px-5 !py-2 text-sm sm:w-auto"
        >
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          Add category
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={<Tags size={20} strokeWidth={1.5} aria-hidden="true" />}
          message="No categories yet."
        />
      ) : (
        <ul style={{ borderTop: "1px solid var(--color-line)" }}>
          {categories.map((cat) => (
            <li
              key={String(cat.id)}
              className="flex min-h-[44px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              style={{ paddingBlock: "var(--space-3)", borderBottom: "1px solid var(--color-line)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: "var(--color-text)" }}>{cat.name}</p>
                <p className="tokens-small" style={{ color: "var(--color-muted)" }}>{formatDate(cat.created_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFormState({ mode: "edit", category: cat })}
                  className="inline-flex min-h-[44px] items-center px-3 text-sm font-semibold"
                  style={{ color: "var(--color-muted)" }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(cat)}
                  className="inline-flex min-h-[44px] items-center px-3 text-sm font-semibold"
                  style={{ color: "var(--color-danger)" }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
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
