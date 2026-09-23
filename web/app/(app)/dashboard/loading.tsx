import { Skeleton } from "../_components/Skeleton";

export default function Loading() {
  return (
    <div>
      {/* PageHeader shape */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <Skeleton width="120px" height="14px" rounded />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="min(320px, 60%)" height="36px" />
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="min(480px, 90%)" height="16px" />
        </div>
        <div className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-6)" }} />
      </div>

      {/* Stats shape */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: "var(--space-12)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-6)" }}>
            <Skeleton width="32px" height="14px" />
            <div style={{ marginTop: "var(--space-3)" }}>
              <Skeleton width="96px" height="48px" />
            </div>
            <div style={{ marginTop: "var(--space-3)" }}>
              <Skeleton width="120px" height="12px" rounded />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column list shape */}
      <div className="grid gap-12 xl:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col}>
            <Skeleton width="200px" height="24px" />
            <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-line)" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}>
                  <Skeleton width="40%" height="14px" />
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <Skeleton width="85%" height="16px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
