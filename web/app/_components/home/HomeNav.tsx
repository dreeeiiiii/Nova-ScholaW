"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#how-to-use", label: "How it works" },
    { href: "#benefits", label: "Benefits" },
    { href: "#about", label: "About" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out bg-white ${scrolled
          ? "shadow-[0_1px_0_rgba(46,42,69,0.08)]"
          : "shadow-[0_1px_0_rgba(46,42,69,0.04)]"
        }`}
    >
      <div className="container-editorial">
        <div className="flex items-center justify-between h-16 md:h-18">
          <Link href="/" className="flex items-center gap-2.5 min-h-[44px]" aria-label="Nova Schola Hub home">
            <span className="font-heading text-xl font-extrabold text-text-main tracking-tight">
              Nova Schola
            </span>
            <span className="hidden sm:inline-block w-px h-6 bg-primary/30" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-muted tracking-widest uppercase">Hub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-muted hover:text-text-main transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/login"
                className="btn-editorial btn-editorial-secondary text-sm px-5 py-2"
              >
                Log in
              </a>
              <a
                href="/register"
                className="btn-editorial btn-editorial-primary text-sm px-5 py-2"
              >
                Get started
              </a>
            </div>

            <button
              className="md:hidden p-2 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-main"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="md:hidden overflow-hidden transition-all duration-300 ease-out bg-white border-t border-primary/10">
            <nav className="py-6 flex flex-col gap-4 px-2" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-text-main py-2 px-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-primary/10">
                <a href="/login" className="btn-editorial btn-editorial-secondary w-full justify-center" onClick={() => setMobileOpen(false)}>
                  Log in
                </a>
                <a href="/register" className="btn-editorial btn-editorial-primary w-full justify-center" onClick={() => setMobileOpen(false)}>
                  Get started
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}