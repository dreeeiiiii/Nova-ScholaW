import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch, ApiError } from "@/lib/api";
import UserManagement from "./_components/UserManagement";

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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const role = typeof sp.role === "string" ? sp.role : undefined;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const rawPage = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = 20;
  const offset = (page - 1) * 20;

  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (role) qs.set("role", role);
  if (search) qs.set("search", search);

  let users: User[] = [];
  let total = 0;
  let error: string | null = null;
  let sections: Section[] = [];
  let courses: Course[] = [];

  const [usersRes, sectionsRes, coursesRes] = await Promise.all([
    serverFetch(`/api/users?${qs.toString()}`)
      .then((data) => ({ data: data as { users?: User[]; total?: number } }))
      .catch((e) => ({ error: e })),
    serverFetch("/api/sections")
      .then((data) => ({ data: data as { sections?: Section[] } }))
      .catch(() => ({ data: { sections: [] } })),
    serverFetch("/api/courses")
      .then((data) => ({ data: data as { courses?: Course[] } }))
      .catch(() => ({ data: { courses: [] } })),
  ]);

  if ("error" in usersRes) {
    const e = (usersRes as { error: unknown }).error;
    error = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load users";
  } else {
    const data = (usersRes as { data: { users?: User[]; total?: number } }).data;
    const raw = data.users ?? [];
    users = raw.map((u) => {
      const copy = { ...u } as Record<string, unknown>;
      if ("password_hash" in copy) delete copy.password_hash;
      return copy as unknown as User;
    });
    total = data.total ?? 0;
  }

  sections = ((sectionsRes as { data: { sections?: Section[] } }).data.sections ?? []) as Section[];
  courses = ((coursesRes as { data: { courses?: Course[] } }).data.courses ?? []) as Course[];

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-sm font-bold text-[#315c86]">ROLE-AWARE WORKSPACE</span>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Users</h1>
          <p className="mt-2 text-sm text-[#66758d]">Manage accounts, roles, and access.</p>
        </div>
        <div className="rounded-2xl bg-[#ffe1d1] px-4 py-3 text-sm font-medium text-[#6b3d27]">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm font-bold text-[#315c86]">ROLE-AWARE WORKSPACE</span>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Users</h1>
        <p className="mt-2 text-sm text-[#66758d]">Manage accounts, roles, and access.</p>
      </div>

      <UserManagement
        initialUsers={users}
        initialTotal={total}
        sections={sections}
        courses={courses}
        role={role}
        search={search}
      />
    </div>
  );
}
