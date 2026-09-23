"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { EmptyState } from "../../../_components/EmptyState";

type AuditLog = {
  id: number | string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | string | null;
  details: unknown;
  ip_address: string | null;
  created_at: string;
};

const ACTION_OPTIONS = [
  "auth.login_success",
  "auth.login_failure",
  "announcements.create",
  "announcements.update",
  "announcements.delete",
  "gallery.upload",
  "gallery.approve",
  "gallery.reject",
  "gallery.category_update",
  "gallery.feature",
  "categories.create",
  "categories.update",
  "categories.delete",
  "users.create",
  "users.update",
  "users.activate",
  "users.deactivate",
] as const;

const ENTITY_OPTIONS = ["announcement", "gallery_media", "user", "category"] as const;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDetails(details: unknown): string | null {
  if (details === null || details === undefined) return null;
  if (typeof details === "string") return details;
  if (typeof details === "object") {
    try {
      const entries = Object.entries(details as Record<string, unknown>);
      if (entries.length === 0) return JSON.stringify(details);
      return entries.map(([k, v]) => `${k}=${String(v)}`).join(", ");
    } catch {
      return JSON.stringify(details);
    }
  }
  return String(details);
}

function FilterBar({
  action,
  entityType,
  onActionChange,
  onEntityChange,
}: {
  action?: string;
  entityType?: string;
  onActionChange: (value: string) => void;
  onEntityChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <label className="w-full flex-1">
        <span className="label-token">Action</span>
        <select
          value={action ?? ""}
          onChange={(e) => onActionChange(e.target.value)}
          className="input-token"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="w-full flex-1">
        <span className="label-token">Entity type</span>
        <select
          value={entityType ?? ""}
          onChange={(e) => onEntityChange(e.target.value)}
          className="input-token"
        >
          <option value="">All entities</option>
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function AuditLogTable({
  initialLogs,
  initialTotal,
  action,
  entityType,
}: {
  initialLogs: AuditLog[];
  initialTotal: number;
  action?: string;
  entityType?: string;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [total, setTotal] = useState<number>(initialTotal);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setTotal(initialTotal);
  }, [initialTotal]);

  function toggleExpand(id: number | string) {
    const key = String(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleActionChange(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("action", value);
    if (entityType) params.set("entity_type", entityType);
    const qs = params.toString();
    router.push(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  }

  function handleEntityChange(value: string) {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (value) params.set("entity_type", value);
    const qs = params.toString();
    router.push(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  }

  async function handleLoadMore() {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", String(logs.length));
      if (action) params.set("action", action);
      if (entityType) params.set("entity_type", entityType);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError((data as { message?: string })?.message ?? "Failed to load more");
        return;
      }
      const newLogs = (data as { logs?: AuditLog[] }).logs ?? [];
      const newTotal = (data as { total?: number }).total;
      setLogs((prev) => [...prev, ...newLogs]);
      if (typeof newTotal === "number") setTotal(newTotal);
    } catch {
      setLoadError("Failed to load more");
    } finally {
      setLoading(false);
    }
  }

  if (logs.length === 0) {
    return (
      <div>
        <FilterBar action={action} entityType={entityType} onActionChange={handleActionChange} onEntityChange={handleEntityChange} />
        <div style={{ marginTop: "var(--space-6)" }}>
          <EmptyState
            icon={<History size={20} strokeWidth={1.5} aria-hidden="true" />}
            message="No audit logs."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <FilterBar action={action} entityType={entityType} onActionChange={handleActionChange} onEntityChange={handleEntityChange} />

      <p className="tokens-small" style={{ color: "var(--color-muted)", marginTop: "var(--space-4)" }}>
        {total} entr{total === 1 ? "y" : "ies"}
      </p>

      {/* Table (horizontal scroll on small screens) */}
      <div className="overflow-x-auto" style={{ marginTop: "var(--space-4)" }}>
        <table className="table-token min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">User</th>
              <th scope="col">Action</th>
              <th scope="col">Entity</th>
              <th scope="col">Details</th>
              <th scope="col" style={{ textAlign: "right" }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const detailsRaw = formatDetails(log.details);
              const isExpanded = expanded.has(String(log.id));
              const displayDetails = detailsRaw ?? "—";
              const truncated = !isExpanded && displayDetails.length > 120 ? displayDetails.slice(0, 120) + "…" : displayDetails;
              const needsTruncate = displayDetails.length > 120;
              return (
                <tr key={String(log.id)}>
                  <td className="whitespace-nowrap tabular-nums tokens-small" style={{ color: "var(--color-text)" }}>{formatTime(log.created_at)}</td>
                  <td>
                    <span className="block text-sm font-semibold">{log.user_name ?? "—"}</span>
                    <span className="tokens-small block" style={{ color: "var(--color-muted)" }}>{log.user_email ?? ""}</span>
                  </td>
                  <td>
                    <span
                      className="tokens-small"
                      style={{
                        borderRadius: "var(--radius-pill)",
                        padding: "2px var(--space-3)",
                        fontWeight: 700,
                        fontSize: "0.6875rem",
                        backgroundColor: "var(--color-primary-soft)",
                        color: "var(--color-primary-ink)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="tokens-small whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                    {log.entity_type ?? "—"}
                    {log.entity_id != null ? ` #${String(log.entity_id)}` : ""}
                  </td>
                  <td className="max-w-[260px]">
                    {detailsRaw === null ? (
                      <span className="tokens-small" style={{ color: "var(--color-muted)" }}>—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => needsTruncate && toggleExpand(log.id)}
                        className={`block text-left font-mono text-xs ${needsTruncate ? "cursor-pointer hover:underline" : ""} min-h-[44px] py-2`}
                        style={{ color: "var(--color-text)" }}
                        title={needsTruncate && !isExpanded ? "Click to expand" : undefined}
                      >
                        {truncated}
                      </button>
                    )}
                  </td>
                  <td className="tokens-small whitespace-nowrap" style={{ color: "var(--color-muted)", textAlign: "right" }}>{log.ip_address ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loadError && <p className="tokens-small mt-4 font-medium" style={{ color: "var(--color-danger)" }}>{loadError}</p>}

      {logs.length < total && (
        <div className="flex justify-center" style={{ marginTop: "var(--space-6)" }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="tokens-btn tokens-btn-secondary w-full !min-h-[44px] text-sm disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
