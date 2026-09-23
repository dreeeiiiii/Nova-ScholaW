"use client";

import Link from "next/link";

type NavLinkProps = {
  href: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Rendered inside the dark drawer — light text variant. */
  tone?: "light" | "dark";
};

/**
 * Shared underline nav link (HomeNav desktop + drawer + Footer).
 * Underline reveals left → right on hover via scale-x.
 * Active route gets a persistent primary underline + dot.
 * Token-only: no hardcoded hex.
 */
export function NavLink({ href, label, active = false, onClick, tone = "light" }: NavLinkProps) {
  const isAnchor = href.startsWith("#");
  const textCls =
    tone === "dark"
      ? "text-white/70 hover:text-white"
      : "text-[var(--color-muted)] hover:text-[var(--color-text)]";

  const inner = (
    <>
      <span>{label}</span>
      {/* hover underline */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
        style={{ backgroundColor: "var(--color-primary)" }}
      />
      {/* active underline */}
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
      )}
      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
      )}
    </>
  );

  const cls = `group relative inline-flex min-h-[44px] items-center text-sm font-medium transition-colors duration-300 motion-reduce:transition-none ${textCls}`;

  if (isAnchor) {
    return (
      <a href={href} onClick={onClick} aria-current={active ? "true" : undefined} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cls}>
      {inner}
    </Link>
  );
}
