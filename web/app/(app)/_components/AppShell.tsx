import {
  LayoutDashboard,
  Megaphone,
  Images,
  UploadCloud,
  Folder,
  Users,
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
  { href: "/announcements/create", label: "Create Class Announcement", icon: Megaphone, roles: ["teacher"] },
  { href: "/admin/departments", label: "Department Management", icon: Users, roles: ["admin"] },
  { href: "/admin/events", label: "Event Management", icon: Images, roles: ["admin"] },
  { href: "/gallery", label: "Event Gallery", icon: Images, roles: ["teacher", "student"] },
  { href: "/gallery/upload", label: "Upload Event Image", icon: UploadCloud, roles: ["teacher", "student"] },
  { href: "/gallery/mine", label: "My Uploads", icon: Folder, roles: ["teacher", "student"] },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["admin"] },
  { href: "/account", label: "Account / Change Password", icon: UserRound, roles: ["admin", "teacher", "student"] },
];

type User = {
  full_name: string;
  role: string;
};

export default function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const navItems = allNavItems.filter((item) => item.roles.includes(user.role)).map(item => user.role === "admin" && item.href === "/announcements" ? {...item,href:"/announcements?type=general",label:"General Announcements"} : item);

  return (
    <div className="min-h-screen w-full lg:flex" style={{ backgroundColor: "var(--color-background)" }}>
      <aside
        data-testid="sidebar"
        className="desktop-sidebar hidden w-64 shrink-0 p-4 lg:block lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
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
              <p className="font-heading text-lg font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
                Nova Schola Hub
              </p>
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

      <MobileNav user={user} navItems={navItems.map(({ href, label }) => ({ href, label }))} />

      <main id="main-content" tabIndex={-1} className="app-main mx-auto w-full max-w-[1550px]">{children}</main>
    </div>
  );
}
