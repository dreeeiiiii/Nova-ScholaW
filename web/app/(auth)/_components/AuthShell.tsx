import Link from "next/link";

type AuthShellProps = {
  eyebrow: string;
  statement: React.ReactNode;
  support?: string;
  indexLabel?: string;
  mobileTitle: string;
  children: React.ReactNode;
};

function Wordmark({ tone }: { tone: "light" | "dark" }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-[44px] items-baseline gap-3"
      aria-label="Nova Schola Hub home"
    >
      <span
        className="font-heading text-xl font-extrabold leading-none tracking-tight"
        style={{ color: tone === "light" ? "var(--color-surface)" : "var(--color-text)" }}
      >
        Nova Schola
      </span>
      <span
        className="text-[10px] font-semibold uppercase"
        style={{
          letterSpacing: "0.25em",
          color: tone === "light" ? "rgba(255, 255, 255, 0.5)" : "var(--color-muted)",
        }}
      >
        Hub
      </span>
    </Link>
  );
}

/**
 * Shared auth split-panel shell (login + register).
 * Desktop: dark brand panel (45%) + form panel (55%, warm canvas).
 * Mobile: slim brand strip on top, form full-width below.
 * Token-only. Includes the shared mount-rise animation.
 */
export function AuthShell({ eyebrow, statement, support, indexLabel, mobileTitle, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Mobile slim brand strip */}
      <div
        className="flex items-center justify-between px-6 py-4 lg:hidden"
        style={{ backgroundColor: "var(--color-dark)", color: "var(--color-surface)" }}
      >
        <Wordmark tone="light" />
        <p className="tokens-small" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
          {mobileTitle}
        </p>
      </div>

      {/* Desktop dark brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[45%] lg:p-16"
        style={{ backgroundColor: "var(--color-dark)", color: "var(--color-surface)" }}
      >
        {indexLabel && (
          <span
            aria-hidden="true"
            className="font-heading pointer-events-none absolute -bottom-8 right-4 select-none font-extrabold"
            style={{ fontSize: "clamp(8rem, 16vw, 14rem)", lineHeight: 1, color: "var(--color-surface)", opacity: 0.05 }}
          >
            {indexLabel}
          </span>
        )}
        <div className="relative z-10">
          <Wordmark tone="light" />
        </div>
        <div className="relative z-10" style={{ maxWidth: "480px" }}>
          <p
            className="tokens-eyebrow"
            style={{ color: "var(--color-accent)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <span
              aria-hidden="true"
              style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)", flexShrink: 0 }}
            />
            {eyebrow}
          </p>
          <div
            className="font-heading text-balance"
            style={{
              color: "var(--color-surface)",
              fontWeight: "var(--weight-display)",
              letterSpacing: "var(--tracking-heading)",
              lineHeight: 1.02,
              fontSize: "clamp(2.25rem, 4vw, 3.5rem)",
              marginTop: "var(--space-6)",
            }}
          >
            {statement}
          </div>
          {support && (
            <p className="tokens-body-lg" style={{ color: "rgba(255, 255, 255, 0.6)", marginTop: "var(--space-6)", maxWidth: "42ch" }}>
              {support}
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className="relative z-10 h-px w-full"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
        />
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 items-center justify-center px-6 py-12 md:px-10 md:py-16 lg:px-16">
        <div className="w-full" style={{ maxWidth: "440px" }}>
          {children}
        </div>
      </div>
    </main>
  );
}
