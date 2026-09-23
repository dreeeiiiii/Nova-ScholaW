import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "var(--color-background)" }}>
      <header
        data-testid="guest-header"
        className="flex h-16 items-center justify-between px-6 md:h-[72px]"
        style={{
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-line)",
        }}
      >
        <Link href="/" className="flex min-h-[44px] items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center"
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
        </Link>
        <Link href="/login" className="tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm">
          Log in
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[1550px] p-4 sm:p-7 lg:p-9">{children}</main>
    </div>
  );
}
