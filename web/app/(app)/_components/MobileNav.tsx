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
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

export function MobileNav({ navItems }: { navItems: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="flex items-center justify-between p-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d9efff] clay">
            <GraduationCap size={20} />
          </div>
          <span className="font-heading text-base font-extrabold text-[#23344f]">Nova Schola Hub</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="clay rounded-2xl bg-[#fdfaf3] p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#fbf7ef] p-5 shadow-2xl transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Mobile navigation"
      >
        <div className="mb-7 flex items-center justify-between">
          <span className="font-heading text-base font-bold text-[#23344f]">Nova Schola Hub</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = iconMap[item.label] ?? LayoutDashboard;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold min-h-[44px] ${active ? "bg-[#d9efff] text-[#23446c] shadow-[inset_3px_3px_7px_#c5d9e8,inset_-3px_-3px_7px_#effaff]" : "text-text-main hover:bg-white"}`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
