import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#2E2A45]/10 bg-[#F0EEFB]">
      <div className="container-editorial py-16 md:py-24">
        {/* Main grid — asymmetric 12-col */}
        <div className="grid grid-cols-12 gap-10 md:gap-12">
          {/* Brand — left anchor */}
          <div className="col-span-12 md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-baseline gap-3"
              aria-label="Nova Schola Hub home"
            >
              <span className="font-heading text-2xl md:text-3xl font-extrabold text-[#2E2A45] tracking-tight leading-none">
                Nova Schola
              </span>
              <span className="text-[10px] md:text-xs font-semibold text-[#2E2A45]/50 tracking-[0.25em] uppercase">
                Hub
              </span>
            </Link>
            <p className="mt-6 text-sm md:text-base text-[#5b5670] max-w-xs leading-relaxed">
              Centralized announcements and memories for Nova Schola Tanauan.
            </p>
          </div>

          {/* Explore column */}
          <nav
            className="col-span-12 sm:col-span-6 md:col-span-3 md:col-start-7"
            aria-label="Footer navigation"
          >
            <span className="text-eyebrow text-[#2E2A45]/40 block mb-5">
              Explore
            </span>
            <ul className="flex flex-col gap-3 text-sm md:text-base">
              <li>
                <a
                  href="#how-to-use"
                  className="text-[#5b5670] hover:text-[#2E2A45] transition-colors duration-200"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#benefits"
                  className="text-[#5b5670] hover:text-[#2E2A45] transition-colors duration-200"
                >
                  Benefits
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-[#5b5670] hover:text-[#2E2A45] transition-colors duration-200"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/gallery"
                  className="text-[#5b5670] hover:text-[#2E2A45] transition-colors duration-200"
                >
                  Gallery
                </a>
              </li>
            </ul>
          </nav>

          {/* Account column */}
          <div className="col-span-12 sm:col-span-6 md:col-span-3 md:col-start-10">
            <span className="text-eyebrow text-[#2E2A45]/40 block mb-5">
              Account
            </span>
            <ul className="flex flex-col gap-3 text-sm md:text-base">
              <li>
                <a
                  href="/login"
                  className="text-[#5b5670] hover:text-[#2E2A45] transition-colors duration-200"
                >
                  Log in
                </a>
              </li>
              <li>
                <a
                  href="/register"
                  className="text-[#5b5670] hover:text-[#2E2A45] transition-colors duration-200"
                >
                  Get started
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}