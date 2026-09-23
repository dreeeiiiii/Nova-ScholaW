import { ServiceList } from "../ui/Services";

const benefits = [
  {
    index: "01",
    title: "One hub",
    description: "Announcements and event memories together — no more scattered group chats.",
  },
  {
    index: "02",
    title: "Role-aware",
    description: "Students, teachers, and admins each see exactly what they need — nothing more.",
  },
  {
    index: "03",
    title: "Moderated content",
    description: "Uploads are reviewed before they go public, keeping the gallery appropriate for a school.",
  },
  {
    index: "04",
    title: "Targeted announcements",
    description: "Send to everyone, or just to specific classes and students.",
  },
  {
    index: "05",
    title: "Searchable gallery",
    description: "Find memories by category, year, or media type in seconds.",
  },
  {
    index: "06",
    title: "Audit trail",
    description: "Every write action is logged, from logins to approvals.",
  },
];

export default function Benefits() {
  return (
    <section
      id="benefits"
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="tokens-container tokens-section">
        <ServiceList
          eyebrow="Why Nova Schola Hub"
          title="Everything in one place."
          description="Designed for the way a school actually communicates. Centralized, moderated, and built around real workflows."
          items={benefits}
        />

        {/* Dev panel — token dark block (layout preserved) */}
        <div style={{ marginTop: "var(--space-24)" }}>
          <div
            className="relative overflow-hidden p-8 md:p-12 lg:p-16 xl:p-20"
            style={{ backgroundColor: "var(--color-dark)", borderRadius: "var(--radius-large)" }}
          >
            <div className="relative z-10" style={{ maxWidth: "42rem" }}>
              <span className="tokens-eyebrow" style={{ color: "var(--color-accent)" }}>
                For developers
              </span>
              <h3
                className="tokens-heading-2 text-balance"
                style={{ color: "var(--color-surface)", marginTop: "var(--space-4)" }}
              >
                Open source. Extensible.
                <br />
                Built on modern standards.
              </h3>
              <p
                className="tokens-body-lg"
                style={{ color: "rgba(255, 255, 255, 0.6)", marginTop: "var(--space-6)", maxWidth: "32rem" }}
              >
                Next.js 16, Express, PostgreSQL, TypeScript end-to-end. Clean
                architecture, ready to extend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
