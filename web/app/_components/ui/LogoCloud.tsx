export type LogoItem = {
  src: string;
  alt: string;
  href?: string;
};

type LogoCloudProps = {
  heading?: string;
  logos: LogoItem[];
  marquee?: boolean;
  speed?: "slow" | "normal" | "fast";
  variant?: "muted" | "color";
};

const SPEED_DURATION: Record<NonNullable<LogoCloudProps["speed"]>, string> = {
  slow: "60s",
  normal: "40s",
  fast: "20s",
};

function LogoImage({ logo, variant }: { logo: LogoItem; variant: "muted" | "color" }) {
  return (
    <img
      src={logo.src}
      alt={logo.alt}
      loading="lazy"
      className={`h-8 w-auto shrink-0 ${variant === "muted" ? "logo-muted" : ""}`}
    />
  );
}

/**
 * Trusted-partners logo arrangement — no cards, borders, or shadows.
 * Static wrapping grid by default; optional seamless marquee
 * (duplicated list, pause on hover, static fallback under reduced motion).
 */
export function LogoCloud({
  heading = "Trusted by teams building ambitious products",
  logos,
  marquee = false,
  speed = "normal",
  variant = "muted",
}: LogoCloudProps) {
  return (
    <div>
      <style>{`
        .logo-muted {
          filter: grayscale(1);
          opacity: 0.6;
          transition: filter 200ms ease, opacity 200ms ease;
        }
        .logo-muted:hover {
          filter: grayscale(0);
          opacity: 1;
        }
        @keyframes logo-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .logo-marquee-track {
          animation: logo-marquee ${SPEED_DURATION[speed]} linear infinite;
        }
        .logo-marquee:hover .logo-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-muted { transition: none; }
          .logo-marquee-track { animation: none; flex-wrap: wrap; width: auto; }
        }
      `}</style>

      {heading && (
        <p className="tokens-small" style={{ color: "var(--color-muted)", textAlign: "center" }}>
          {heading}
        </p>
      )}

      {!marquee ? (
        <div
          className="flex flex-wrap items-center justify-center"
          style={{ gap: "var(--space-8) var(--space-12)", marginTop: heading ? "var(--space-8)" : 0 }}
        >
          {logos.map((logo) =>
            logo.href ? (
              <a key={logo.src + logo.alt} href={logo.href} aria-label={logo.alt}>
                <LogoImage logo={logo} variant={variant} />
              </a>
            ) : (
              <LogoImage key={logo.src + logo.alt} logo={logo} variant={variant} />
            )
          )}
        </div>
      ) : (
        <div
          className="logo-marquee overflow-hidden"
          style={{ marginTop: heading ? "var(--space-8)" : 0 }}
          role="list"
          aria-label={heading || "Partner logos"}
        >
          <div
            className="logo-marquee-track flex w-max items-center"
            style={{ gap: "var(--space-12)", paddingRight: "var(--space-12)" }}
          >
            {[...logos, ...logos].map((logo, i) => (
              <span key={`${logo.src}-${i}`} role="listitem" aria-hidden={i >= logos.length} className="shrink-0">
                <LogoImage logo={logo} variant={variant} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
