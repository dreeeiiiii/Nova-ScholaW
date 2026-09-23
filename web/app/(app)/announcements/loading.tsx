import { Skeleton } from "../_components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <Skeleton width="140px" height="14px" rounded />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="min(280px, 60%)" height="34px" />
        </div>
        <div className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-6)" }} />
      </div>
      <Skeleton width="min(420px, 90%)" height="44px" />
      <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-line)" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ paddingBlock: "var(--space-4)", borderBottom: "1px solid var(--color-line)" }}>
            <Skeleton width="160px" height="20px" rounded />
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton width="70%" height="18px" />
            </div>
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton width="95%" height="14px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
