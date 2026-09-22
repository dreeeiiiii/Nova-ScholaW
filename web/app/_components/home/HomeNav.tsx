import Link from "next/link";

export default function HomeNav() {
  return (
    <header className="sticky top-0 z-30 bg-base/80 backdrop-blur supports-[backdrop-filter]:bg-base/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 min-h-[44px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9efff] text-sm font-extrabold text-[#315c86] clay-card">
            NSH
          </div>
          <span className="font-heading text-sm font-extrabold text-text-main sm:text-base">
            Nova Schola Hub
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            <a href="#how-to-use" className="text-sm font-semibold text-text-muted hover:text-text-main">
              How to use
            </a>
            <a href="#benefits" className="text-sm font-semibold text-text-muted hover:text-text-main">
              Benefits
            </a>
            <a href="#about" className="text-sm font-semibold text-text-muted hover:text-text-main">
              About
            </a>
          </div>
          <Link
            href="/login"
            className="clay-btn rounded-clay-pill bg-[#315c86] px-6 py-2.5 text-sm font-bold text-white shadow-clay min-h-[44px] flex items-center"
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
