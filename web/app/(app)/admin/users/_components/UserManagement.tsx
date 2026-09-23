"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import UserFormModal from "./UserFormModal";
import ConfirmModal from "./ConfirmModal";
import { EmptyState } from "../../../_components/EmptyState";

type User = {
  id: number | string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student";
  section_id: number | null;
  course_id: number | null;
  is_active: boolean;
  section_name?: string | null;
  course_name?: string | null;
};

type Section = { id: number | string; name: string };
type Course = { id: number | string; name: string };

function stripPasswordHash<T extends Record<string, unknown>>(obj: T): T {
  if (obj && typeof obj === "object" && "password_hash" in obj) {
    const copy = { ...obj } as Record<string, unknown>;
    delete copy.password_hash;
    return copy as unknown as T;
  }
  return obj;
}

function RoleBadge({ role }: { role: User["role"] }) {
  const palette =
    role === "admin"
      ? { bg: "var(--color-primary-soft)", fg: "var(--color-primary-ink)" }
      : role === "teacher"
        ? { bg: "var(--color-success-bg)", fg: "var(--color-success)" }
        : { bg: "var(--color-info-bg)", fg: "var(--color-info)" };
  return (
    <span
      className="tokens-small"
      style={{
        borderRadius: "var(--radius-pill)",
        padding: "2px var(--space-3)",
        fontWeight: 700,
        fontSize: "0.6875rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        backgroundColor: palette.bg,
        color: palette.fg,
      }}
    >
      {role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="tokens-small"
      style={{
        borderRadius: "var(--radius-pill)",
        padding: "2px var(--space-3)",
        fontWeight: 700,
        fontSize: "0.6875rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        backgroundColor: active ? "var(--color-success-bg)" : "var(--color-warning-bg)",
        color: active ? "var(--color-success)" : "var(--color-warning)",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function UserManagement({
  initialUsers,
  initialTotal,
  sections,
  courses,
  role,
  search,
}: {
  initialUsers: User[];
  initialTotal: number;
  sections: Section[];
  courses: Course[];
  role?: string;
  search?: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(() => initialUsers.map((u) => stripPasswordHash(u as unknown as Record<string, unknown>) as unknown as User));
  const [total, setTotal] = useState(initialTotal);
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formState, setFormState] = useState<{ mode: "create" | "edit"; user?: User } | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setUsers(initialUsers.map((u) => stripPasswordHash(u as unknown as Record<string, unknown>) as unknown as User));
  }, [initialUsers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setTotal(initialTotal);
  }, [initialTotal]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setSearchInput(search ?? "");
  }, [search]);

  // Debounced search
  useEffect(() => {
    const current = search ?? "";
    if (searchInput === current) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      const trimmed = searchInput.trim();
      if (trimmed) params.set("search", trimmed);
      const qs = params.toString();
      router.push(`/admin/users${qs ? `?${qs}` : ""}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function handleRoleChange(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("role", value);
    // Use current searchInput if user has typed, otherwise fallback to prop
    const effectiveSearch = searchInput.trim() ? searchInput.trim() : search ?? "";
    const finalSearch = effectiveSearch.trim();
    if (finalSearch) params.set("search", finalSearch);
    // If we derived from params above, ensure correct handling
    // Simpler: if searchInput has value, use it else use search prop
    const qs = params.toString();
    router.push(`/admin/users${qs ? `?${qs}` : ""}`);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", String(users.length));
      if (role) params.set("role", role);
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError((data as { message?: string })?.message ?? "Failed to load more");
        return;
      }
      const newUsersRaw = (data as { users?: User[] }).users ?? [];
      const newUsers = newUsersRaw.map((u) => stripPasswordHash(u as unknown as Record<string, unknown>) as unknown as User);
      const newTotal = (data as { total?: number }).total;
      setUsers((prev) => [...prev, ...newUsers]);
      if (typeof newTotal === "number") setTotal(newTotal);
    } catch {
      setLoadError("Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleToggleActive(target: User) {
    const action = target.is_active ? "deactivate" : "activate";
    if (action === "deactivate") {
      setConfirmUser(target);
      return;
    }
    await doToggle(target, action);
  }

  async function doToggle(target: User, action: "activate" | "deactivate") {
    const key = String(target.id);
    setActionLoading(key);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(key)}/${action}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Could show toast, for now ignore or could set error
        return;
      }
      const updatedRaw = (data as { user?: User }).user ?? { ...target, is_active: action === "activate" };
      const updated = stripPasswordHash(updatedRaw as unknown as Record<string, unknown>) as unknown as User;
      setUsers((prev) => prev.map((u) => (String(u.id) === key ? { ...u, ...updated, is_active: action === "activate" } : u)));
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
      setConfirmUser(null);
    }
  }

  function handleSaved(updatedUserRaw: User) {
    const updatedUser = stripPasswordHash(updatedUserRaw as unknown as Record<string, unknown>) as unknown as User;
    if (formState?.mode === "create") {
      setUsers((prev) => [updatedUser, ...prev]);
      setTotal((prev) => prev + 1);
    } else if (formState?.mode === "edit") {
      setUsers((prev) => prev.map((u) => (String(u.id) === String(updatedUser.id) ? { ...u, ...updatedUser } : u)));
    }
    setFormState(null);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="w-full sm:w-auto sm:min-w-[180px]">
          <span className="label-token">Role</span>
          <select
            value={role ?? ""}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="input-token"
          >
            <option value="">All roles</option>
            <option value="admin">admin</option>
            <option value="teacher">teacher</option>
            <option value="student">student</option>
          </select>
        </label>
        <label className="w-full flex-1">
          <span className="label-token">Search</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or email"
            className="input-token"
          />
        </label>
        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFormState({ mode: "create" })}
            className="tokens-btn tokens-btn-primary w-full !min-h-[44px] !px-5 !py-2 text-sm sm:w-auto"
          >
            Add user
          </button>
        </div>
      </div>

      <p className="tokens-small" style={{ color: "var(--color-muted)", marginTop: "var(--space-4)" }}>
        {total} user{total === 1 ? "" : "s"}
      </p>

      {users.length === 0 ? (
        <div style={{ marginTop: "var(--space-4)" }}>
          <EmptyState
            icon={<Users size={20} strokeWidth={1.5} aria-hidden="true" />}
            message="No users found."
          />
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ marginTop: "var(--space-4)" }}>
          <table className="table-token min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Section / Course</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={String(u.id)}>
                  <td className="font-medium" style={{ fontWeight: 600 }}>{u.full_name}</td>
                  <td className="tokens-small" style={{ color: "var(--color-muted)" }}>{u.email}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="tokens-small" style={{ color: "var(--color-muted)" }}>
                    {u.role === "student" ? (
                      <>
                        <span className="block">{u.section_name ?? (u.section_id != null ? `Section #${u.section_id}` : "—")}</span>
                        <span className="block">{u.course_name ?? (u.course_id != null ? `Course #${u.course_id}` : "—")}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusBadge active={u.is_active} />
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => setFormState({ mode: "edit", user: u })}
                      className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold"
                      style={{ color: "var(--color-muted)" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(u)}
                      disabled={actionLoading === String(u.id)}
                      className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold disabled:opacity-60"
                      style={{ color: u.is_active ? "var(--color-danger)" : "var(--color-success)" }}
                    >
                      {actionLoading === String(u.id) ? "…" : u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadError && <p className="tokens-small mt-4 font-medium" style={{ color: "var(--color-danger)" }}>{loadError}</p>}

      {users.length < total && (
        <div className="flex justify-center" style={{ marginTop: "var(--space-6)" }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="tokens-btn tokens-btn-secondary w-full !min-h-[44px] text-sm disabled:opacity-60 sm:w-auto"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {formState && (
        <UserFormModal
          mode={formState.mode}
          initial={formState.user}
          sections={sections}
          courses={courses}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmUser && (
        <ConfirmModal
          onClose={() => setConfirmUser(null)}
          onConfirm={() => doToggle(confirmUser, "deactivate")}
          loading={actionLoading === String(confirmUser.id)}
        />
      )}
    </div>
  );
}
