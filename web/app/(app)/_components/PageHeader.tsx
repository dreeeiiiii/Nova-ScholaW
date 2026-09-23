type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Standard internal page header (functional, h2-scale — not marketing).
 * Eyebrow → title → description, actions right-aligned on desktop,
 * stacked below on mobile. Thin bottom rule optional via parent.
 * Reused by every (app) page (Steps 8a + 8b).
 */
export function PageHeader({ eyebrow, title, description, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={className} style={{ marginBottom: "var(--space-8)" }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div style={{ maxWidth: "720px" }}>
          {eyebrow && (
            <p
              className="tokens-eyebrow"
              style={{ color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <span
                aria-hidden="true"
                style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)", flexShrink: 0 }}
              />
              {eyebrow}
            </p>
          )}
          <h1
            className="tokens-heading-2 text-balance"
            style={{ color: "var(--color-text)", marginTop: eyebrow ? "var(--space-3)" : 0 }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="tokens-body"
              style={{ color: "var(--color-muted)", marginTop: "var(--space-3)", maxWidth: "60ch", textWrap: "pretty" }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3 md:justify-end">{actions}</div>
        )}
      </div>
      <div aria-hidden="true" className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-6)" }} />
    </div>
  );
}
