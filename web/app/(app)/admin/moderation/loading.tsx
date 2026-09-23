import { Skeleton } from "../../_components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <Skeleton width="140px" height="14px" rounded />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="min(240px, 60%)" height="34px" />
        </div>
        <div className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-6)" }} />
      </div>
      <Skeleton width="220px" height="44px" />
      <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--color-line)" }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 lg:flex-row" style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}>
            <Skeleton width="100%" height="180px" />
            <div className="flex-1">
              <Skeleton width="60%" height="18px" />
              <div style={{ marginTop: "var(--space-2)" }}>
                <Skeleton width="90%" height="14px" />
              </div>
              <div style={{ marginTop: "var(--space-4)" }}>
                <Skeleton width="200px" height="44px" rounded />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
