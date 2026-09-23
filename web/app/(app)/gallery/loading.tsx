import { Skeleton } from "../_components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <Skeleton width="160px" height="14px" rounded />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="min(280px, 60%)" height="34px" />
        </div>
        <div className="h-px w-full" style={{ backgroundColor: "var(--color-line)", marginTop: "var(--space-6)" }} />
      </div>
      <Skeleton width="min(560px, 100%)" height="44px" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ marginTop: "var(--space-6)", gap: "var(--space-4)" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton width="100%" height="180px" />
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton width="75%" height="14px" />
            </div>
            <div style={{ marginTop: "var(--space-2)" }}>
              <Skeleton width="50%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
