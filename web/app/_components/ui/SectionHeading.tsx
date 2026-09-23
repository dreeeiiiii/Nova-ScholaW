type SectionHeadingProps = {
  eyebrow?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  cta?: React.ReactNode;
  className?: string;
};

const TITLE_CLASS: Record<NonNullable<SectionHeadingProps["size"]>, string> = {
  sm: "tokens-heading-3",
  md: "tokens-heading-2",
  lg: "tokens-heading-1",
};

/**
 * Reusable editorial section heading.
 * Eyebrow (muted, accent dot) → large title → muted description → CTA slot.
 * Token-only: no hardcoded values.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  size = "md",
  cta,
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={className}
      style={{
        textAlign: centered ? "center" : "left",
        maxWidth: centered ? "880px" : undefined,
        marginInline: centered ? "auto" : undefined,
      }}
    >
      {eyebrow && (
        <p
          className="tokens-eyebrow"
          style={{
            color: "var(--color-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--color-accent)",
              flexShrink: 0,
            }}
          />
          {eyebrow}
        </p>
      )}
      <h2
        className={`${TITLE_CLASS[size]} text-balance`}
        style={{ color: "var(--color-text)", marginTop: eyebrow ? "var(--space-4)" : 0 }}
      >
        {title}
      </h2>
      {description && (
        <div
          className="tokens-body-lg"
          style={{
            color: "var(--color-muted)",
            marginTop: "var(--space-6)",
            maxWidth: "60ch",
            marginInline: centered ? "auto" : undefined,
            textWrap: "pretty",
          }}
        >
          {description}
        </div>
      )}
      {cta && (
        <div
          style={{
            marginTop: "var(--space-8)",
            display: "flex",
            gap: "var(--space-4)",
            flexWrap: "wrap",
            justifyContent: centered ? "center" : "flex-start",
          }}
        >
          {cta}
        </div>
      )}
    </div>
  );
}
