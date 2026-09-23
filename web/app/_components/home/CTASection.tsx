import Link from "next/link";
import { RevealOnScroll } from "../ui/RevealOnScroll";

export default function CTASection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--color-dark)", color: "var(--color-surface)" }}
    >
      <div className="tokens-container tokens-section">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <RevealOnScroll direction="up" className="lg:col-span-8">
            <div style={{ maxWidth: "60ch" }}>
              <p
                className="tokens-eyebrow"
                style={{ color: "var(--color-accent)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)", flexShrink: 0 }}
                />
                Ready to get started?
              </p>
              <h2
                className="tokens-heading-1 text-balance"
                style={{ color: "var(--color-surface)", marginTop: "var(--space-6)" }}
              >
                Join Nova Schola Hub today.
              </h2>
              <p
                className="tokens-body-lg"
                style={{ color: "rgba(255, 255, 255, 0.65)", marginTop: "var(--space-6)", textWrap: "pretty" }}
              >
                Set up your school&rsquo;s announcement hub in minutes. Free for educational
                institutions.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="up" delay={80} className="lg:col-span-4">
            <div className="flex flex-col items-start gap-4 lg:items-end">
              <Link href="/register" className="tokens-btn tokens-btn-accent group">
                Create your hub
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                >
                  &rarr;
                </span>
              </Link>
              <Link
                href="/gallery"
                className="inline-flex min-h-[44px] items-center text-sm font-medium transition-colors duration-300 hover:text-white motion-reduce:transition-none"
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                Explore the gallery
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
