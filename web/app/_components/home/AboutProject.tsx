import { RevealOnScroll } from "../ui/RevealOnScroll";

const facts = [
  { label: "Frontend", value: "Next.js 16 · React 19 · TypeScript · Tailwind CSS 4" },
  { label: "Backend", value: "Express 4 · Node.js · PostgreSQL · Prisma ORM" },
  { label: "Auth & Security", value: "JWT + HttpOnly Cookies · Role-based Access · Rate Limiting · Audit Logging" },
  { label: "Infrastructure", value: "Vercel · Docker · GitHub Actions · Managed PostgreSQL" },
];

export default function AboutProject() {
  return (
    <section
      id="about"
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="tokens-container tokens-section">
        {/* 1 — Editorial statement */}
        <RevealOnScroll direction="up">
          <div style={{ maxWidth: "960px" }}>
            <p
              className="tokens-eyebrow"
              style={{ color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <span
                aria-hidden="true"
                style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)", flexShrink: 0 }}
              />
              About
            </p>
            <h2
              className="tokens-heading-1 text-balance"
              style={{ color: "var(--color-text)", marginTop: "var(--space-6)" }}
            >
              School communication,{" "}
              <span className="relative inline-block">
                in one place.
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
            </h2>
            <p
              className="tokens-body-lg"
              style={{ color: "var(--color-muted)", marginTop: "var(--space-6)", maxWidth: "60ch", textWrap: "pretty" }}
            >
              Nova Schola Hub centralizes school announcements and event memories into a single
              moderated platform — built as a capstone project for the Bachelor of Science in
              Information Systems program, with role-based access, content moderation, and a
              modern web stack.
            </p>
          </div>
        </RevealOnScroll>

        {/* Thin editorial rule */}
        <div aria-hidden="true" className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-16)" }} />

        {/* 3 — Supporting facts (tech stack, flat mini-grid) */}
        <RevealOnScroll direction="up" delay={80}>
          <dl
            className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
            style={{ marginTop: "var(--space-12)" }}
          >
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="tokens-eyebrow" style={{ color: "var(--color-muted)" }}>
                  {fact.label}
                </dt>
                <dd className="tokens-small" style={{ color: "var(--color-text)", marginTop: "var(--space-3)", lineHeight: 1.7 }}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </RevealOnScroll>
      </div>
    </section>
  );
}
