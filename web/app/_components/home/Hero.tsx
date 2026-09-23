import Link from "next/link";

const TRUST_ITEMS = ["Official announcements", "Moderated gallery", "Role-based access"];

/**
 * Asymmetric editorial hero (60/40 grid, oversized headline, tall visual).
 * Token-only. Staggered rise-in on load, disabled under reduced motion.
 */
export default function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
      aria-labelledby="hero-heading"
    >
      <style>{`
        .rise-in {
          opacity: 0;
          animation: rise-in 500ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .rise-in { opacity: 1; animation: none; transform: none; }
        }
      `}</style>

      {/* Oversized faint editorial numeral */}
      <span
        aria-hidden="true"
        className="font-heading pointer-events-none absolute -top-6 right-0 hidden select-none font-extrabold lg:block"
        style={{ fontSize: "clamp(10rem, 22vw, 20rem)", lineHeight: 1, color: "var(--color-text)", opacity: 0.05 }}
      >
        01
      </span>

      <div className="tokens-container relative">
        <div className="grid items-center gap-12 pb-16 pt-28 md:pb-24 md:pt-36 lg:grid-cols-12 lg:gap-8 lg:pb-32 lg:pt-44">
          {/* Left — copy (~7 cols) */}
          <div className="lg:col-span-7">
            <p
              className="tokens-eyebrow rise-in"
              style={{ color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)", animationDelay: "0ms" }}
            >
              <span
                aria-hidden="true"
                style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)", flexShrink: 0 }}
              />
              Nova Schola Tanauan
            </p>

            <h1
              id="hero-heading"
              className="tokens-heading-1 rise-in text-balance"
              style={{ color: "var(--color-text)", marginTop: "var(--space-6)", animationDelay: "100ms" }}
            >
              A better way for schools to{" "}
              <span className="relative inline-block" style={{ color: "var(--color-primary)" }}>
                communicate.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 w-full"
                  style={{ height: "0.14em", color: "var(--color-primary)" }}
                >
                  <path d="M3 9 C 60 3, 160 3, 217 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
                </svg>
              </span>
            </h1>

            <p
              className="tokens-body-lg rise-in"
              style={{ color: "var(--color-muted)", marginTop: "var(--space-6)", maxWidth: "52ch", textWrap: "pretty", animationDelay: "200ms" }}
            >
              Official announcements, targeted class updates, and a moderated event gallery — built for
              how a school actually communicates.
            </p>

            <div className="rise-in" style={{ marginTop: "var(--space-8)", display: "flex", gap: "var(--space-4)", flexWrap: "wrap", animationDelay: "300ms" }}>
              <Link href="/register" className="tokens-btn tokens-btn-primary group">
                Explore the Platform
                <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
                  &rarr;
                </span>
              </Link>
              <Link href="#how-to-use" className="tokens-btn tokens-btn-secondary">
                See How It Works
              </Link>
            </div>

            <ul
              className="rise-in"
              aria-label="Platform highlights"
              style={{ marginTop: "var(--space-8)", display: "flex", gap: "var(--space-6)", flexWrap: "wrap", animationDelay: "350ms" }}
            >
              {TRUST_ITEMS.map((item) => (
                <li
                  key={item}
                  className="tokens-small"
                  style={{ color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: "6px", height: "6px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-primary)", flexShrink: 0 }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — visual (~5 cols, tall, overlaps text column) */}
          <div className="lg:col-span-5">
            <figure
              className="rise-in relative"
              style={{ animationDelay: "400ms" }}
            >
              <div
                className="relative overflow-hidden"
                style={{
                  borderRadius: "var(--radius-large)",
                  boxShadow: "var(--shadow-medium)",
                  aspectRatio: "4 / 5",
                }}
              >
                <img
                  src="https://images.pexels.com/photos/18587790/pexels-photo-18587790.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Students gathered at a Nova Schola school event"
                  className="h-full w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <figcaption
                className="tokens-small absolute bottom-4 left-4"
                style={{
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderRadius: "var(--radius-pill)",
                  padding: "var(--space-2) var(--space-4)",
                  boxShadow: "var(--shadow-subtle)",
                }}
              >
                Field Day 2026 · Tanauan Campus
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Thin editorial rule */}
        <div aria-hidden="true" className="h-px w-full" style={{ backgroundColor: "var(--color-line)" }} />
      </div>
    </section>
  );
}
