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
    title: "General, Department and Class Announcements",
    description: "Administrator publishes General and Department Announcements. Teachers publish Class Announcements for intended Students.",
  },
  {
    index: "05",
    title: "Searchable gallery",
    description: "Find memories by category and year in seconds.",
  },
  {
    index: "06",
    title: "Audit trail",
    description: "The Administrator can review significant account, announcement and event actions.",
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

        {/* School community panel */}
        <div style={{ marginTop: "var(--space-24)" }}>
          <div
            className="relative overflow-hidden p-8 md:p-12 lg:p-16 xl:p-20"
            style={{ backgroundColor: "var(--color-dark)", borderRadius: "var(--radius-large)" }}
          >
            <div className="relative z-10" style={{ maxWidth: "42rem" }}>
              <span className="tokens-eyebrow" style={{ color: "var(--color-accent)" }}>
                For Nova Schola Tanauan
              </span>
              <h3
                className="tokens-heading-2 text-balance"
                style={{ color: "var(--color-surface)", marginTop: "var(--space-4)" }}
              >
                Official updates.
                <br />
                Shared school memories.
              </h3>
              <p
                className="tokens-body-lg"
                style={{ color: "rgba(255, 255, 255, 0.6)", marginTop: "var(--space-6)", maxWidth: "32rem" }}
              >
                Read school announcements, keep up with your department and class,
                and share event images through Administrator review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
