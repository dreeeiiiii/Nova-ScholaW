"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserFormModal from "./UserFormModal";
import ConfirmModal from "./ConfirmModal";

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

function roleBadge(role: User["role"]) {
  if (role === "admin") return "bg-[#e7defb] text-[#563d86]";
  if (role === "teacher") return "bg-[#dff5e8] text-[#246044]";
  return "bg-[#d9efff] text-[#23446c]";
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
    setUsers(initialUsers.map((u) => stripPasswordHash(u as unknown as Record<string, unknown>) as unknown as User));
  }, [initialUsers]);

  useEffect(() => {
    setTotal(initialTotal);
  }, [initialTotal]);

  useEffect(() => {
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
    const trimmed = searchInput.trim() || (search ?? "").trim();
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
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="clay flex flex-wrap gap-3 rounded-3xl bg-[#fdfaf3] p-4">
        <label className="flex min-w-[180px] flex-col gap-1 text-sm">
          <span className="text-xs font-bold text-[#23344f]">Role</span>
          <select
            value={role ?? ""}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
          >
            <option value="">All roles</option>
            <option value="admin">admin</option>
            <option value="teacher">teacher</option>
            <option value="student">student</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-bold text-[#23344f]">Search</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or email"
            className="rounded-xl bg-white p-2 text-sm ring-1 ring-[#d9efff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setFormState({ mode: "create" })}
            className="rounded-full bg-[#dff5e8] px-5 py-2 text-sm font-bold text-[#246044] hover:brightness-95"
          >
            Add user
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
          <p className="text-sm font-medium text-[#23344f]">No users found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="clay overflow-hidden rounded-3xl bg-[#fdfaf3]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fbf7ef] text-xs font-bold text-[#66758d]">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Section / Course</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={String(u.id)} className="border-t border-[#f0e6d8]">
                        <td className="px-4 py-3 font-medium text-[#23344f]">{u.full_name}</td>
                        <td className="px-4 py-3 text-xs text-[#66758d]">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadge(u.role)}`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#66758d]">
                          {u.role === "student" ? (
                            <>
                              <div>{u.section_name ?? (u.section_id != null ? `Section #${u.section_id}` : "—")}</div>
                              <div>{u.course_name ?? (u.course_id != null ? `Course #${u.course_id}` : "—")}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${u.is_active ? "bg-[#dff5e8] text-[#246044]" : "bg-[#ffe1d1] text-[#6b3d27]"}`}
                          >
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormState({ mode: "edit", user: u })}
                              className="rounded-full bg-[#d9efff] px-3 py-1 text-xs font-bold text-[#23446c] hover:brightness-95"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              disabled={actionLoading === String(u.id)}
                              className={`rounded-full px-3 py-1 text-xs font-bold hover:brightness-95 disabled:opacity-60 ${u.is_active ? "bg-[#ffe1d1] text-[#6b3d27]" : "bg-[#dff5e8] text-[#246044]"}`}
                            >
                              {actionLoading === String(u.id) ? "..." : u.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-4 md:hidden">
            {users.map((u) => (
              <div key={String(u.id)} className="clay rounded-3xl bg-[#fdfaf3] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#23344f]">{u.full_name}</p>
                    <p className="text-xs text-[#66758d]">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadge(u.role)}`}>{u.role}</span>
                </div>
                {u.role === "student" && (
                  <div className="mt-2 text-xs text-[#66758d]">
                    <p>Section: {u.section_name ?? (u.section_id ?? "—")}</p>
                    <p>Course: {u.course_name ?? (u.course_id ?? "—")}</p>
                  </div>
                )}
                <div className="mt-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${u.is_active ? "bg-[#dff5e8] text-[#246044]" : "bg-[#ffe1d1] text-[#6b3d27]"}`}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState({ mode: "edit", user: u })}
                    className="rounded-full bg-[#d9efff] px-4 py-2 text-xs font-bold text-[#23446c]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(u)}
                    disabled={actionLoading === String(u.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold disabled:opacity-60 ${u.is_active ? "bg-[#ffe1d1] text-[#6b3d27]" : "bg-[#dff5e8] text-[#246044]"}`}
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {loadError && <p className="text-sm font-medium text-[#6b3d27]">{loadError}</p>}

      {users.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-full bg-[#d9efff] px-6 py-2 text-sm font-bold text-[#315c86] hover:brightness-95 disabled:opacity-60"
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
