"use client";

import { SectionHeading } from "./SectionHeading";
import { RevealOnScroll } from "./RevealOnScroll";

export type ServiceItemData = {
  index: string;
  title: string;
  description?: string;
  bullets?: string[];
  /** When true, bullets render fully expanded (walkthrough steps). Default: hover-reveal. */
  expandedBullets?: boolean;
  image?: string;
  href?: string;
};

type ServiceListProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  items: ServiceItemData[];
  className?: string;
};

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="inline-block transition-all duration-300 ease-out motion-reduce:transition-none md:-translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100"
      style={{ color: "var(--color-primary)", fontSize: "1.25rem", lineHeight: 1 }}
    >
      &rarr;
    </span>
  );
}

function ServiceItem({ item }: { item: ServiceItemData }) {
  const content = (
    <span
      className="grid grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-3 md:gap-x-6 lg:grid-cols-12 lg:items-center"
      style={{ paddingBlock: "var(--space-8)" }}
    >
      {/* Index */}
      <span
        aria-hidden="true"
        className="font-heading col-start-1 font-extrabold leading-none"
        style={{
          color: "var(--color-muted)",
          opacity: 0.45,
          fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
          letterSpacing: "var(--tracking-heading)",
        }}
      >
        {item.index}
      </span>

      {/* Title + bullets */}
      <span className="col-start-2 min-w-0 lg:col-span-4 lg:col-start-2">
        <span
          className="font-heading block font-bold tracking-tight transition-transform duration-300 ease-out motion-reduce:transition-none md:group-hover:translate-x-2"
          style={{ color: "var(--color-text)", fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)", lineHeight: 1.2 }}
        >
          {item.title}
        </span>
        {item.bullets && item.bullets.length > 0 && (
          <span
            className={
              item.expandedBullets
                ? "block"
                : "block max-h-0 overflow-hidden opacity-0 transition-all duration-300 ease-out motion-reduce:transition-none md:group-hover:max-h-40 md:group-hover:opacity-100"
            }
          >
            <span className="block" style={{ marginTop: "var(--space-3)" }}>
              {item.bullets.slice(0, 3).map((bullet) => (
                <span
                  key={bullet}
                  className="tokens-small block"
                  style={{ color: "var(--color-muted)", marginTop: "var(--space-1)" }}
                >
                  {bullet}
                </span>
              ))}
            </span>
          </span>
        )}
      </span>

      {/* Arrow (mobile: always visible, right column) */}
      <span className="col-start-3 row-start-1 flex min-h-[44px] items-center justify-end lg:col-span-1 lg:col-start-12">
        <Arrow />
      </span>

      {/* Description */}
      {item.description && (
        <span
          className="tokens-body col-span-3 col-start-1 lg:col-span-4 lg:col-start-7"
          style={{ color: "var(--color-muted)" }}
        >
          {item.description}
        </span>
      )}

      {/* Hover preview image — desktop only */}
      {item.image && (
        <span className="hidden lg:col-span-2 lg:col-start-11 lg:block" aria-hidden="true">
          <span
            className="block overflow-hidden opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none md:group-hover:opacity-100"
            style={{ borderRadius: "var(--radius-medium)" }}
          >
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          </span>
        </span>
      )}
    </span>
  );

  const rowClass =
    "group block transition-colors duration-300 ease-out motion-reduce:transition-none hover:bg-[var(--color-surface)]";
  const rowStyle: React.CSSProperties = {
    minHeight: "64px",
    borderBottom: "1px solid var(--color-line)",
  };

  if (item.href) {
    return (
      <a href={item.href} className={rowClass} style={rowStyle}>
        {content}
      </a>
    );
  }

  return (
    <div className={rowClass} style={rowStyle}>
      {content}
    </div>
  );
}

/**
 * Editorial numbered service/capability list.
 * SectionHeading on top, staggered hover-reactive rows below.
 * Token-only: no hardcoded values, cards, or boxes.
 */
export function ServiceList({ eyebrow, title, description, items, className = "" }: ServiceListProps) {
  return (
    <div className={className}>
      <RevealOnScroll direction="up">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} size="md" />
      </RevealOnScroll>
      <div style={{ marginTop: "var(--space-12)", borderTop: "1px solid var(--color-line)" }}>
        {items.map((item, i) => (
          <RevealOnScroll key={item.index + item.title} direction="up" delay={i * 80}>
            <ServiceItem item={item} />
          </RevealOnScroll>
        ))}
      </div>
    </div>
  );
}
