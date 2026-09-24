import {
  LayoutDashboard,
  Megaphone,
  Images,
  UploadCloud,
  Folder,
  ClipboardList,
  Users,
  Tags,
  ShieldCheck,
  GraduationCap,
  UserRound,
} from "lucide-react";
import { MobileNav } from "./MobileNav";
import { LogoutButton } from "./LogoutButton";
import AppNav from "./AppNav";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: string[];
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
  { href: "/announcements", label: "Announcements", icon: Megaphone, roles: ["admin", "teacher", "student"] },
  { href: "/gallery", label: "Event Gallery", icon: Images, roles: ["admin", "teacher", "student"] },
  { href: "/gallery/upload", label: "Upload Media", icon: UploadCloud, roles: ["admin", "teacher", "student"] },
  { href: "/gallery/mine", label: "My Uploads", icon: Folder, roles: ["admin", "teacher", "student"] },
  { href: "/admin/moderation", label: "Moderation", icon: ClipboardList, roles: ["admin"] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["admin"] },
  { href: "/admin/categories", label: "Categories", icon: Tags, roles: ["admin", "teacher"] },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["admin"] },
];

type User = {
  full_name: string;
  role: string;
};

export default function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const navItems = allNavItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen w-full lg:flex" style={{ backgroundColor: "var(--color-background)" }}>
      <aside
        data-testid="sidebar"
        className="desktop-sidebar hidden w-72 shrink-0 p-6 lg:block lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
        aria-label="Main navigation"
      >
        <div
          className="flex h-full flex-col p-5"
          style={{
            borderRadius: "var(--radius-large)",
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-subtle)",
            border: "1px solid var(--color-line)",
          }}
        >
          <div className="mb-9 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center"
              style={{
                borderRadius: "var(--radius-medium)",
                backgroundColor: "var(--color-primary-soft)",
                color: "var(--color-primary-ink)",
              }}
            >
              <GraduationCap size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-heading text-xl font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
                Nova Schola Hub
              </h1>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
                Official school connection
              </p>
            </div>
          </div>

          <AppNav navItems={navItems.map(({ href, label }) => ({ href, label }))} />

          <div className="mt-auto pt-6">
            <div
              className="flex items-center gap-3 p-4"
              style={{ borderRadius: "var(--radius-medium)", backgroundColor: "var(--color-surface-warm)" }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center"
                style={{
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-muted)",
                }}
              >
                <UserRound size={20} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  {user.full_name}
                </span>
                <span className="block text-xs capitalize" style={{ color: "var(--color-muted)" }}>
                  {user.role}
                </span>
                <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
                  Nova Schola Tanauan
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <MobileNav navItems={navItems.map(({ href, label }) => ({ href, label }))} />

      <main className="mx-auto w-full max-w-[1550px] overflow-hidden p-4 sm:p-7 lg:p-9">{children}</main>
    </div>
  );
}
