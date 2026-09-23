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
      <div className="flex justify-end">
        <Skeleton width="160px" height="44px" rounded />
      </div>
      <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-line)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ paddingBlock: "var(--space-3)", borderBottom: "1px solid var(--color-line)" }}>
            <Skeleton width="40%" height="16px" />
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton width="25%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
