import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="clay-card p-6">
        <h1 className="font-heading text-xl font-bold text-text-main">
          Welcome, {user.full_name} <span className="clay-badge ml-2 px-3 py-1 text-xs capitalize">{user.role}</span>
        </h1>
        <p className="mt-2 text-sm text-text-muted">Role: {user.role} · Email: {user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {["Announcements", "Gallery", "Upload"].map((title) => (
          <div key={title} className="clay-card p-5">
            <h2 className="font-heading text-sm font-bold text-text-main">{title}</h2>
            <p className="mt-2 text-xs text-text-muted">Phase 3 will populate this</p>
          </div>
        ))}
      </div>

      <div className="clay-card p-6">
        <p className="text-sm text-text-muted">Dashboard content coming in Phase 3.</p>
      </div>
    </div>
  );
}
