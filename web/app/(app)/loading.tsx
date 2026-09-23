import { Skeleton } from "./_components/Skeleton";

export default function Loading() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
      <div className="w-full" style={{ maxWidth: "480px" }}>
        <Skeleton width="140px" height="14px" rounded />
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="70%" height="28px" />
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <Skeleton width="100%" height="14px" />
        </div>
      </div>
    </div>
  );
}
