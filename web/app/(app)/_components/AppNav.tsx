"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  Dashboard: LayoutDashboard,
  Announcements: Megaphone,
  "Event Gallery": Images,
  "Upload Media": UploadCloud,
  "My Uploads": Folder,
  Moderation: ClipboardList,
  Users: Users,
  Categories: Tags,
  "Audit Logs": ShieldCheck,
};

type NavItem = {
  href: string;
  label: string;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Desktop sidebar nav — editorial minimal.
 * Active = primary left bar + soft tint. Icons monochrome thin-stroke.
 * Token-only: no hardcoded hex, no legacy neumorphic classes.
 */
export default function AppNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav data-testid="sidebar-nav" className="flex flex-col gap-1" aria-label="School hub sections">
      {navItems.map((item) => {
        const Icon = iconMap[item.label] ?? LayoutDashboard;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            aria-current={active ? "page" : undefined}
            className="relative flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors duration-300 motion-reduce:transition-none"
            style={{
              borderRadius: "var(--radius-medium)",
              color: active ? "var(--color-text-strong)" : "var(--color-muted)",
              backgroundColor: active ? "var(--color-primary-soft)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.backgroundColor = "var(--color-surface)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 transition-opacity duration-300 motion-reduce:transition-none"
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
  );
}
