import Link from "next/link";
import {
  LayoutDashboard,
  Megaphone,
  Images,
  UploadCloud,
  ClipboardList,
  Users,
  ShieldCheck,
  GraduationCap,
  UserRound,
} from "lucide-react";
import { MobileNav } from "./MobileNav";
import { LogoutButton } from "./LogoutButton";

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
  { href: "/admin/moderation", label: "Moderation", icon: ClipboardList, roles: ["admin"] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["admin"] },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["admin"] },
];

type User = {
  full_name: string;
  role: string;
};

export default function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const navItems = allNavItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen w-full bg-[#fbf7ef] lg:flex">
      <aside className="desktop-sidebar hidden w-72 shrink-0 p-6 lg:block" aria-label="Main navigation">
        <div className="clay flex h-full flex-col rounded-[2rem] bg-[#fdfaf3] p-5">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9efff] clay text-[#315c86]">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-heading text-xl font-extrabold leading-tight text-[#23344f]">Nova Schola Hub</h1>
              <p className="mt-0.5 text-xs text-[#66758d]">Official school connection</p>
            </div>
          </div>

          <nav className="space-y-2" aria-label="School hub sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#23344f] hover:translate-y-[-1px] hover:shadow-[5px_5px_11px_#d7d3ca,-4px_-4px_10px_#fff]"
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="flex items-center gap-3 rounded-2xl bg-[#e7defb] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#faf5ff]">
                <UserRound size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#23344f]">{user.full_name}</span>
                <span className="block text-xs capitalize text-[#66758d]">{user.role}</span>
                <span className="block text-xs text-[#66758d]">Nova Schola Tanauan</span>
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
