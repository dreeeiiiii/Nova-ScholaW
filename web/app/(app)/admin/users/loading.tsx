import { Skeleton } from "../../_components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <Skeleton width="140px" height="14px" rounded />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="min(220px, 50%)" height="34px" />
        </div>
        <div className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-6)" }} />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton width="180px" height="44px" />
        <Skeleton width="100%" height="44px" />
      </div>
      <div style={{ marginTop: "var(--space-4)" }}>
        <Skeleton width="100%" height="14px" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ paddingBlock: "12px", borderBottom: "1px solid var(--color-line)" }}>
            <Skeleton width={i % 2 === 0 ? "100%" : "85%"} height="16px" />
          </div>
        ))}
      </div>
    </div>
  );
}
