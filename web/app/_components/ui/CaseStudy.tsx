/**
 * CaseStudy editorial list (Step 6 of 10 — Option A: build only, not mounted).
 * ---------------------------------------------------------------------------
 * Usage example (for a later step / page):
 *
 *   import { CaseStudyList } from "./ui/CaseStudy";
 *
 *   <CaseStudyList
 *     eyebrow="Selected work"
 *     title="Stories from the campus."
 *     description="A few highlights from announcements, events, and the gallery."
 *     items={[
 *       {
 *         category: "Digital platform",
 *         title: "Nova Schola Hub",
 *         description: "Centralized announcements and a moderated event gallery for the whole school.",
 *         metric: { value: "+35%", label: "Engagement" },
 *         image: "/images/hub.jpg",
 *         imageAlt: "Students browsing the Nova Schola Hub gallery",
 *         href: "/work/nova-schola-hub",
 *       },
 *       // …more items; layout auto-cycles left → right → feature → …
 *     ]}
 *   />
 *
 * Variants auto-cycle by index (index % 3 → left / right / feature);
 * pass `variant` on an item to override.
 */

import { SectionHeading } from "./SectionHeading";
import { RevealOnScroll } from "./RevealOnScroll";

export type CaseStudyVariant = "left" | "right" | "feature";

export type CaseStudyItemData = {
  category: string;
  title: string;
  description: string;
  metric?: {
    value: string;
    label: string;
  };
  image: string;
  imageAlt: string;
  href: string;
  variant?: CaseStudyVariant;
};

type CaseStudyListProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  items: CaseStudyItemData[];
  className?: string;
};

const AUTO_VARIANTS: CaseStudyVariant[] = ["left", "right", "feature"];

function CtaLink({ href, label = "View Case Study" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="group/cta inline-flex min-h-[44px] items-center gap-2 text-sm font-bold"
      style={{ color: "var(--color-text)" }}
    >
      <span className="relative">
        {label}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-300 ease-out group-hover/cta:scale-x-100 motion-reduce:transition-none"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
      </span>
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-300 ease-out group-hover/cta:translate-x-1 motion-reduce:transition-none"
        style={{ color: "var(--color-primary)" }}
      >
        &rarr;
      </span>
    </a>
  );
}

function TextBlock({ item, oversized = false }: { item: CaseStudyItemData; oversized?: boolean }) {
  return (
    <div>
      <p
        className="tokens-eyebrow"
        style={{ color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
      >
        <span
          aria-hidden="true"
          style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)", flexShrink: 0 }}
        />
        {item.category}
      </p>
      <h3
        className={oversized ? "tokens-heading-1 text-balance" : "tokens-heading-2 text-balance"}
        style={{ color: "var(--color-text)", marginTop: "var(--space-4)" }}
      >
        {item.title}
      </h3>
      <p
        className="tokens-body"
        style={{ color: "var(--color-muted)", marginTop: "var(--space-4)", maxWidth: "52ch", textWrap: "pretty" }}
      >
        {item.description}
      </p>
      {item.metric && (
        <div style={{ marginTop: "var(--space-6)" }}>
          <p
            className="font-heading"
            style={{
              color: "var(--color-text)",
              fontWeight: "var(--weight-display)",
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1,
              fontSize: oversized ? "clamp(3rem, 7vw, 5.5rem)" : "clamp(2.5rem, 5vw, 4rem)",
            }}
          >
            {item.metric.value}
          </p>
          <p className="tokens-eyebrow" style={{ color: "var(--color-muted)", marginTop: "var(--space-2)" }}>
            {item.metric.label}
          </p>
        </div>
      )}
      <div style={{ marginTop: "var(--space-6)" }}>
        <CtaLink href={item.href} />
      </div>
    </div>
  );
}

function ImageBlock({ item, aspect = "4 / 3" }: { item: CaseStudyItemData; aspect?: string }) {
  return (
    <a
      href={item.href}
      aria-label={`${item.title} — view case study`}
      className="group/img block overflow-hidden"
      style={{ backgroundColor: "var(--color-background-deep)" }}
    >
      <img
        src={item.image}
        alt={item.imageAlt}
        loading="lazy"
        className="w-full object-cover transition-transform duration-500 ease-out motion-reduce:transition-none md:group-hover/img:scale-[1.02]"
        style={{ aspectRatio: aspect }}
      />
    </a>
  );
}

function CaseStudy({ item, variant }: { item: CaseStudyItemData; variant: CaseStudyVariant }) {
  if (variant === "feature") {
    return (
      <article>
        <RevealOnScroll direction="up">
          <ImageBlock item={item} aspect="16 / 9" />
        </RevealOnScroll>
        <div
          className="grid gap-8 lg:grid-cols-12"
          style={{ marginTop: "var(--space-8)" }}
        >
          <RevealOnScroll direction="up" delay={80} className="lg:col-span-7">
            <TextBlock item={item} oversized />
          </RevealOnScroll>
        </div>
      </article>
    );
  }

  const imageFirst = variant === "left";

  return (
    <article className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
      <RevealOnScroll
        direction="up"
        className={imageFirst ? "lg:col-span-7" : "lg:col-span-7 lg:order-2"}
      >
        <ImageBlock item={item} />
      </RevealOnScroll>
      <RevealOnScroll
        direction="up"
        delay={80}
        className={imageFirst ? "lg:col-span-5" : "lg:col-span-5 lg:order-1"}
      >
        <TextBlock item={item} />
      </RevealOnScroll>
    </article>
  );
}

/**
 * Editorial alternating case-study list.
 * Auto-cycles left → right → feature; whitespace separates items.
 * Token-only: squared images, no cards, borders, or heavy shadows.
 */
export function CaseStudyList({ eyebrow, title, description, items, className = "" }: CaseStudyListProps) {
  return (
    <div className={className}>
      <RevealOnScroll direction="up">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} size="md" />
      </RevealOnScroll>
      <div>
        {items.map((item, i) => (
          <div key={item.title + i} style={{ marginTop: "var(--section-space)" }}>
            <CaseStudy item={item} variant={item.variant ?? AUTO_VARIANTS[i % AUTO_VARIANTS.length]} />
          </div>
        ))}
      </div>
    </div>
  );
}
