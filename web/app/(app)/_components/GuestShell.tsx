import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#fbf7ef]">
      <header
        data-testid="guest-header"
        className="flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-sm"
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#d9efff] clay text-[#315c86]">
            <GraduationCap size={20} />
          </div>
          <span className="font-heading text-base font-extrabold text-[#23344f]">Nova Schola Hub</span>
        </Link>
        <Link
          href="/login"
          className="clay-btn rounded-full bg-[#315c86] px-5 py-2 text-sm font-bold text-white"
        >
          Log in
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[1550px] p-4 sm:p-7 lg:p-9">{children}</main>
    </div>
  );
}
