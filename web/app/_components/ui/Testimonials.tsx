/**
 * Testimonials (Step 7 of 10 — Option A: build only, not wired into any page).
 * ---------------------------------------------------------------------------
 * Usage example (for a later step / page):
 *
 *   import { Testimonials } from "./ui/Testimonials";
 *
 *   <Testimonials
 *     eyebrow="Kind words"
 *     title="Loved by the campus."
 *     items={[
 *       {
 *         quote: "Morning announcements finally reach every classroom on time.",
 *         author: "Maria Santos",
 *         role: "Principal",
 *         company: "Nova Schola Tanauan",
 *       },
 *     ]}
 *     layout="stacked"
 *   />
 */

"use client";

import { useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { RevealOnScroll } from "./RevealOnScroll";

export type TestimonialItem = {
  quote: string;
  author: string;
  role: string;
  company?: string;
  avatar?: string;
};

type TestimonialsProps = {
  eyebrow?: string;
  title?: string;
  items: TestimonialItem[];
  layout?: "stacked" | "grid" | "carousel";
  className?: string;
};

function AuthorLine({ item }: { item: TestimonialItem }) {
  return (
    <div className="flex items-center gap-4" style={{ marginTop: "var(--space-6)" }}>
      {item.avatar && (
        <img
          src={item.avatar}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 object-cover"
          style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-background-deep)" }}
        />
      )}
      <div>
        <p className="tokens-small" style={{ color: "var(--color-text)", fontWeight: 700 }}>
          {item.author}
        </p>
        <p className="tokens-small" style={{ color: "var(--color-muted)", marginTop: "2px" }}>
          {item.role}
          {item.company ? ` · ${item.company}` : ""}
        </p>
      </div>
    </div>
  );
}

function StackedQuotes({ items }: { items: TestimonialItem[] }) {
  return (
    <div style={{ marginTop: "var(--space-12)" }}>
      {items.map((item, i) => (
        <RevealOnScroll key={item.author + i} direction="up">
          <figure
            style={{
              paddingBlock: "var(--space-12)",
              borderTop: i === 0 ? "1px solid var(--color-line)" : undefined,
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <blockquote
              className="tokens-heading-3 text-balance"
              style={{ color: "var(--color-text)", maxWidth: "28ch", textWrap: "balance" }}
            >
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <AuthorLine item={item} />
          </figure>
        </RevealOnScroll>
      ))}
    </div>
  );
}

function GridQuotes({ items }: { items: TestimonialItem[] }) {
  return (
    <div
      className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2"
      style={{ marginTop: "var(--space-12)" }}
    >
      {items.map((item, i) => (
        <RevealOnScroll key={item.author + i} direction="up" delay={(i % 2) * 80}>
          <figure
            style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-6)" }}
          >
            <blockquote className="tokens-body-lg" style={{ color: "var(--color-text)", textWrap: "pretty" }}>
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <AuthorLine item={item} />
          </figure>
        </RevealOnScroll>
      ))}
    </div>
  );
}

function CarouselQuotes({ items }: { items: TestimonialItem[] }) {
  const [index, setIndex] = useState(0);
  const current = items[index];

  if (!current) return null;

  return (
    <div style={{ marginTop: "var(--space-12)" }}>
      <div className="relative" style={{ minHeight: "280px" }} aria-live="polite">
        {items.map((item, i) => (
          <figure
            key={item.author + i}
            className="transition-opacity duration-300 ease-out motion-reduce:transition-none"
            style={{
              opacity: i === index ? 1 : 0,
              pointerEvents: i === index ? "auto" : "none",
              position: i === index ? "relative" : "absolute",
              inset: i === index ? undefined : 0,
            }}
            aria-hidden={i === index ? undefined : true}
          >
            <blockquote
              className="tokens-heading-3 text-balance"
              style={{ color: "var(--color-text)", maxWidth: "28ch" }}
            >
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <AuthorLine item={item} />
          </figure>
        ))}
      </div>
      <div className="flex items-center gap-3" style={{ marginTop: "var(--space-8)" }} role="tablist" aria-label="Testimonials">
        {items.map((item, i) => (
          <button
            key={item.author + i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show testimonial from ${item.author}`}
            onClick={() => setIndex(i)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <span
              aria-hidden="true"
              className="block transition-all duration-300 motion-reduce:transition-none"
              style={{
                width: i === index ? "24px" : "8px",
                height: "8px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: i === index ? "var(--color-primary)" : "var(--color-line-strong)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Editorial testimonials — oversized quotes, no card chrome.
 * Stacked (default), grid, or manual carousel. Token-only.
 */
export function Testimonials({ eyebrow, title, items, layout = "stacked", className = "" }: TestimonialsProps) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      {(eyebrow || title) && (
        <RevealOnScroll direction="up">
          <SectionHeading eyebrow={eyebrow} title={title ?? ""} size="md" />
        </RevealOnScroll>
      )}
      {layout === "grid" ? (
        <GridQuotes items={items} />
      ) : layout === "carousel" ? (
        <CarouselQuotes items={items} />
      ) : (
        <StackedQuotes items={items} />
      )}
    </div>
  );
}
