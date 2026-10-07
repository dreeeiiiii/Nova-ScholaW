"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Images,
  UploadCloud,
  Folder,
  ClipboardList,
  Users,
  Tags,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { NavDrawer } from "../../_components/nav/NavDrawer";
import { matchesNavPath } from "../../_components/nav/activePath";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  Dashboard: LayoutDashboard,
  Announcements: Megaphone,
  "Event Gallery": Images,
  "General Announcements": Megaphone,
  "Upload Event Image": UploadCloud,
  "Upload Status": Folder,
  "My Uploads": Folder,
  "Create Class Announcement": Megaphone,
  "Pending Uploads": ClipboardList,
  "Department Management": Users,
  "Event Management": Images,
  "Account / Change Password": UserRound,
  Categories: Tags,
  "Audit Logs": ShieldCheck,
};

type NavItem = {
  href: string;
  label: string;
};

export function MobileNav({ navItems, user }: { navItems: NavItem[]; user: { full_name: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header
        className="flex items-center justify-between p-4 lg:hidden"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center"
            style={{
              borderRadius: "var(--radius-medium)",
              backgroundColor: "var(--color-primary-soft)",
              color: "var(--color-primary-ink)",
            }}
          >
            <GraduationCap size={20} strokeWidth={1.5} />
          </div>
          <span className="font-heading text-base font-extrabold" style={{ color: "var(--color-text)" }}>
            Nova Schola Hub
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="app-mobile-menu"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors duration-300 motion-reduce:transition-none"
          style={{
            borderRadius: "var(--radius-medium)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          {open ? <X size={20} strokeWidth={1.5} aria-hidden="true" /> : <Menu size={20} strokeWidth={1.5} aria-hidden="true" />}
        </button>
      </header>

      <NavDrawer open={open} onClose={() => setOpen(false)} label="Mobile navigation" variant="panel">
        <div className="mb-7 flex items-center justify-between">
          <span className="font-heading text-base font-bold" style={{ color: "var(--color-text)" }}>
            Nova Schola Hub
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            style={{ borderRadius: "var(--radius-small)", color: "var(--color-text)" }}
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <p className="mb-6 font-semibold">{user.full_name}<span className="block text-sm capitalize" style={{color:"var(--color-muted)"}}>{user.role} · Nova Schola Tanauan</span></p>
        <nav id="app-mobile-menu" className="flex flex-col gap-1" aria-label="Mobile navigation">
          {navItems.map((item, i) => {
            const Icon = iconMap[item.label] ?? LayoutDashboard;
            const hrefPath = item.href.split("?")[0];
            const active = matchesNavPath(pathname, item.href) && !navItems.some(other => { const otherPath = other.href.split("?")[0]; return otherPath.length > hrefPath.length && matchesNavPath(pathname, other.href); });
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[44px] w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold transition-all duration-200 motion-reduce:transition-none"
                style={{
                  borderRadius: "var(--radius-medium)",
                  color: active ? "var(--color-text-strong)" : "var(--color-muted)",
                  backgroundColor: active ? "var(--color-primary-soft)" : "transparent",
                  transitionDelay: open ? `${Math.min(i * 40, 320)}ms` : "0ms",
                  opacity: open ? 1 : 0,
                  transform: open ? "translateX(0)" : "translateX(-8px)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2"
                  style={{
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--color-primary)",
                    opacity: active ? 1 : 0,
                  }}
                />
                <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6"><LogoutButton className="w-full" /></div>
      </NavDrawer>
    </>
  );
}
