"use client";

import { useEffect, useRef, useState } from "react";

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

export default function UserFormModal({
  mode,
  initial,
  sections,
  courses,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: User;
  sections: Section[];
  courses: Course[];
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>(initial?.role ?? "student");
  const [sectionId, setSectionId] = useState<string>(initial?.section_id != null ? String(initial.section_id) : "");
  const [courseId, setCourseId] = useState<string>(initial?.course_id != null ? String(initial.course_id) : "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!email.endsWith("@my.nst.edu.ph")) {
      setError("Email must end with @my.nst.edu.ph");
      return;
    }
    if (mode === "create") {
      if (!password) {
        setError("Password is required");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    } else if (password && password.length > 0 && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: fullName.trim(),
        email: email.trim(),
        role,
        is_active: isActive,
      };
      if (role === "student") {
        payload.section_id = sectionId ? Number(sectionId) : null;
        payload.course_id = courseId ? Number(courseId) : null;
      } else {
        payload.section_id = null;
        payload.course_id = null;
      }
      if (mode === "create") {
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }

      const url = mode === "create" ? "/api/users" : `/api/users/${encodeURIComponent(String(initial!.id))}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { message?: string })?.message ?? "Failed to save user";
        setError(msg);
        return;
      }
      const returnedUser = (data as { user?: User }).user ?? (data as User);
      // Never expose password_hash
      if (returnedUser && typeof returnedUser === "object" && "password_hash" in (returnedUser as Record<string, unknown>)) {
        delete (returnedUser as Record<string, unknown>).password_hash;
      }
      onSaved(returnedUser as User);
      onClose();
    } catch {
      setError("Failed to save user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "Create user" : "Edit user"}
        className="clay max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-[#fdfaf3] p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#23344f]">{mode === "create" ? "Add user" : "Edit user"}</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f0e6d8] px-3 py-1 text-sm font-bold text-[#6b3d27]">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-bold text-[#23344f]">Full name *</span>
            <input
              ref={firstInputRef}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white p-2 text-sm ring-1 ring-[#d9efff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-bold text-[#23344f]">Email *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mode === "edit"}
              placeholder="user@my.nst.edu.ph"
              className="mt-1 w-full rounded-xl bg-white p-2 text-sm ring-1 ring-[#d9efff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9] disabled:opacity-60"
              required
            />
          </label>

          {mode === "create" ? (
            <label className="block text-sm">
              <span className="text-xs font-bold text-[#23344f]">Password *</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white p-2 text-sm ring-1 ring-[#d9efff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
                required
                minLength={8}
              />
              <span className="mt-1 block text-xs text-[#66758d]">Min 8 characters</span>
            </label>
          ) : (
            <label className="block text-sm">
              <span className="text-xs font-bold text-[#23344f]">Password (leave blank to keep)</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white p-2 text-sm ring-1 ring-[#d9efff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
                placeholder="New password"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="text-xs font-bold text-[#23344f]">Role *</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User["role"])}
              className="mt-1 w-full rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
            >
              <option value="admin">admin</option>
              <option value="teacher">teacher</option>
              <option value="student">student</option>
            </select>
          </label>

          {role === "student" && (
            <>
              <label className="block text-sm">
                <span className="text-xs font-bold text-[#23344f]">Section</span>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
                >
                  <option value="">No section</option>
                  {sections.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-xs font-bold text-[#23344f]">Course</span>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
                >
                  <option value="">No course</option>
                  {courses.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-xs font-bold text-[#23344f]">Active</span>
          </label>

          {error && <p className="rounded-xl bg-[#ffe1d1] px-3 py-2 text-sm font-medium text-[#6b3d27]">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#f0e6d8] px-5 py-2 text-sm font-bold text-[#6b3d27]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#dff5e8] px-5 py-2 text-sm font-bold text-[#246044] hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
