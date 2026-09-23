import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { FooterColumn } from "./FooterColumn";

type SocialIconProps = {
  size?: number;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
};

function FacebookIcon(props: SocialIconProps) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon(props: SocialIconProps) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon(props: SocialIconProps) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

const EXPLORE_LINKS = [
  { href: "#how-to-use", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#about", label: "About" },
  { href: "/gallery", label: "Gallery" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Get started" },
];

const SOCIALS = [
  { href: "#", label: "Facebook", Icon: FacebookIcon },
  { href: "#", label: "Instagram", Icon: InstagramIcon },
  { href: "#", label: "YouTube", Icon: YoutubeIcon },
];

/**
 * Large editorial footer — dark rhythm anchor.
 * CTA block → divider → multi-column → bottom row. Token-only.
 */
export default function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--color-dark)", color: "var(--color-surface)" }}>
      <div className="tokens-container tokens-section-sm">
        {/* 1 — CTA block */}
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="tokens-eyebrow block" style={{ color: "var(--color-accent)" }}>
              Nova Schola Hub
            </span>
            <p className="tokens-heading-2 mt-6 max-w-3xl text-balance text-white">
              Let&rsquo;s build something worth remembering.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
            <Link href="/register" className="tokens-btn tokens-btn-accent group">
              Start a Conversation
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
              >
                &rarr;
              </span>
            </Link>
            <Link
              href="#about"
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-white/60 transition-colors duration-300 hover:text-white motion-reduce:transition-none"
            >
              Learn more about the project
            </Link>
          </div>
        </div>

        {/* 2 — Divider */}
        <div
          aria-hidden="true"
          className="my-12 h-px w-full md:my-16"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
        />

        {/* 3 — Multi-column */}
        <div className="grid grid-cols-12 gap-10 md:gap-12">
          <div className="col-span-12 md:col-span-5">
            <Link href="/" className="inline-flex items-baseline gap-3" aria-label="Nova Schola Hub home">
              <span className="font-heading text-2xl font-extrabold leading-none tracking-tight text-white md:text-3xl">
                Nova Schola
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50 md:text-xs">
                Hub
              </span>
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60 md:text-base">
              Centralized announcements and memories for Nova Schola Tanauan.
            </p>
            <div className="mt-8 flex flex-col gap-3 text-sm">
              <a
                href="mailto:hello@novaschola.edu"
                className="inline-flex min-h-[44px] items-center gap-3 text-white/60 transition-colors duration-300 hover:text-white motion-reduce:transition-none"
              >
                <Mail size={16} strokeWidth={1.5} aria-hidden="true" />
                hello@novaschola.edu
              </a>
              <a
                href="tel:+63491234567"
                className="inline-flex min-h-[44px] items-center gap-3 text-white/60 transition-colors duration-300 hover:text-white motion-reduce:transition-none"
              >
                <Phone size={16} strokeWidth={1.5} aria-hidden="true" />
                +63 (49) 123 4567
              </a>
            </div>
            <div className="mt-8 flex items-center gap-2">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors duration-300 motion-reduce:transition-none"
                  style={{ borderRadius: "var(--radius-pill)", color: "rgba(255,255,255,0.6)" }}
                >
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="col-span-12 sm:col-span-6 md:col-span-3 md:col-start-7">
            <FooterColumn title="Explore" links={EXPLORE_LINKS} />
          </div>

          <div className="col-span-12 sm:col-span-6 md:col-span-3 md:col-start-10">
            <FooterColumn title="Account" links={ACCOUNT_LINKS} />
          </div>
        </div>

        {/* 4 — Bottom row */}
        <div
          className="mt-12 flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between md:mt-16"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.12)" }}
        >
          <p className="text-xs text-white/40">&copy; 2026 Nova Schola Hub. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs">
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center text-white/40 transition-colors duration-300 hover:text-white motion-reduce:transition-none"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-[44px] items-center text-white/40 transition-colors duration-300 hover:text-white motion-reduce:transition-none"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
