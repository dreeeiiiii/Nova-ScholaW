"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Images,
  UploadCloud,
  ClipboardList,
  Users,
  Tags,
  ShieldCheck,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Dashboard: LayoutDashboard,
  Announcements: Megaphone,
  "Event Gallery": Images,
  "Upload Media": UploadCloud,
  Moderation: ClipboardList,
  Users: Users,
  Categories: Tags,
  "Audit Logs": ShieldCheck,
};

type NavItem = {
  href: string;
  label: string;
};

export default function AppNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav data-testid="sidebar-nav" className="space-y-2" aria-label="School hub sections">
      {navItems.map((item) => {
        const Icon = iconMap[item.label] ?? LayoutDashboard;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
              active
                ? "bg-[#d9efff] text-[#23446c] shadow-[inset_3px_3px_7px_#c5d9e8,inset_-3px_-3px_7px_#effaff]"
                : "text-[#23344f] hover:translate-y-[-1px] hover:shadow-[5px_5px_11px_#d7d3ca,-4px_-4px_10px_#fff]"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
