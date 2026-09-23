"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavLink } from "../nav/NavLink";
import { NavDrawer } from "../nav/NavDrawer";

const NAV_LINKS = [
  { href: "#how-to-use", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#about", label: "About" },
];

export default function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change (render-phase adjustment, no effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  // Track active anchor via hash changes + scroll-spy.
  useEffect(() => {
    const onHash = () => setActiveHash(window.location.hash);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveHash(`#${e.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-40 transition-all duration-300 motion-reduce:transition-none"
        style={
          scrolled
            ? {
                backgroundColor: "var(--color-surface)",
                borderBottom: "1px solid var(--color-line)",
                backdropFilter: "blur(12px)",
              }
            : { backgroundColor: "transparent", borderBottom: "1px solid transparent" }
        }
      >
        <div className="tokens-container">
          <div className="flex h-16 items-center justify-between md:h-[72px]">
            <Link
              href="/"
              className="flex min-h-[44px] items-center gap-2.5"
              aria-label="Nova Schola Hub home"
            >
              <span
                className="font-heading text-xl font-extrabold tracking-tight"
                style={{ color: "var(--color-text)" }}
              >
                Nova Schola
              </span>
              <span
                aria-hidden="true"
                className="hidden h-6 w-px sm:inline-block"
                style={{ backgroundColor: "var(--color-line-strong)" }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-muted)" }}
              >
                Hub
              </span>
            </Link>

            <nav className="hidden items-center gap-10 md:flex" aria-label="Main navigation">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} active={activeHash === link.href} />
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 md:flex">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium transition-colors duration-300 motion-reduce:transition-none"
                  style={{ color: "var(--color-muted)" }}
                >
                  Log in
                </Link>
                <Link href="/register" className="tokens-btn tokens-btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
                  Let&rsquo;s Talk <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>

              <button
                type="button"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center md:hidden"
                style={{ color: "var(--color-text)" }}
                onClick={() => setMobileOpen((v) => !v)}
                aria-expanded={mobileOpen}
                aria-controls="home-mobile-nav"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <NavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} label="Mobile navigation" variant="fullscreen">
        <div id="home-mobile-nav" className="tokens-container flex h-full flex-col py-6">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xl font-extrabold tracking-tight text-white">
              Nova Schola
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-2 pt-12" aria-label="Mobile navigation">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-heading text-4xl font-extrabold tracking-tight text-white/90 transition-all duration-200 motion-reduce:transition-none"
                style={{
                  transitionDelay: `${i * 40}ms`,
                  opacity: mobileOpen ? 1 : 0,
                  transform: mobileOpen ? "translateY(0)" : "translateY(12px)",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div
            className="mt-auto flex flex-col gap-3 transition-opacity duration-200 motion-reduce:transition-none"
            style={{ transitionDelay: `${NAV_LINKS.length * 40}ms` }}
          >
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-white/70"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="tokens-btn tokens-btn-accent w-full justify-center"
            >
              Let&rsquo;s Talk <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </NavDrawer>
    </>
  );
}
