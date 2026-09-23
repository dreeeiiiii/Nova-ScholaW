type SkeletonProps = {
  width?: string;
  height?: string;
  rounded?: boolean;
  className?: string;
};

/**
 * Token-based skeleton block: surface fill, subtle 1.5s pulse loop,
 * reduced-motion safe (static block). Shape matches the content it replaces.
 */
export function Skeleton({ width = "100%", height = "16px", rounded = false, className = "" }: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes app-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .app-skeleton {
          animation: app-skeleton-pulse 1.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .app-skeleton { animation: none; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className={`app-skeleton ${className}`}
        style={{
          width,
          height,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: rounded ? "var(--radius-pill)" : "var(--radius-small)",
        }}
      />
    </>
  );
}
