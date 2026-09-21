"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
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
      <div className="space-y-4">
        <div className="clay flex flex-wrap gap-3 rounded-3xl bg-[#fdfaf3] p-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs font-bold text-[#23344f]">Action</span>
            <select
              value={action ?? ""}
              onChange={(e) => handleActionChange(e.target.value)}
              className="rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs font-bold text-[#23344f]">Entity type</span>
            <select
              value={entityType ?? ""}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
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

        <div className="clay rounded-3xl bg-[#fdfaf3] p-8 text-center">
          <p className="text-sm font-medium text-[#23344f]">No audit logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="clay flex flex-wrap gap-3 rounded-3xl bg-[#fdfaf3] p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-bold text-[#23344f]">Action</span>
          <select
            value={action ?? ""}
            onChange={(e) => handleActionChange(e.target.value)}
            className="rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-bold text-[#23344f]">Entity type</span>
          <select
            value={entityType ?? ""}
            onChange={(e) => handleEntityChange(e.target.value)}
            className="rounded-xl bg-[#d9efff] p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fc9]"
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

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="clay overflow-hidden rounded-3xl bg-[#fdfaf3]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbf7ef] text-xs font-bold text-[#66758d]">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP</th>
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
                    <tr key={String(log.id)} className="border-t border-[#f0e6d8]">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#23344f]">{formatTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[#23344f]">{log.user_name ?? "—"}</div>
                        <div className="text-xs text-[#66758d]">{log.user_email ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#23344f]">{log.action}</td>
                      <td className="px-4 py-3 text-xs text-[#66758d]">
                        {log.entity_type ?? "—"}
                        {log.entity_id != null ? ` #${String(log.entity_id)}` : ""}
                      </td>
                      <td className="max-w-[260px] px-4 py-3">
                        {detailsRaw === null ? (
                          <span className="text-xs text-[#66758d]">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => needsTruncate && toggleExpand(log.id)}
                            className={`text-left font-mono text-xs ${needsTruncate ? "cursor-pointer hover:underline" : ""} text-[#23344f]`}
                            title={needsTruncate && !isExpanded ? "Click to expand" : undefined}
                          >
                            {truncated}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#66758d]">{log.ip_address ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-4 md:hidden">
        {logs.map((log) => {
          const detailsRaw = formatDetails(log.details);
          const isExpanded = expanded.has(String(log.id));
          const displayDetails = detailsRaw ?? "—";
          const truncated = !isExpanded && displayDetails.length > 120 ? displayDetails.slice(0, 120) + "…" : displayDetails;
          const needsTruncate = displayDetails.length > 120;
          return (
            <div key={String(log.id)} className="clay rounded-3xl bg-[#fdfaf3] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-[#e7defb] px-3 py-1 text-xs font-bold text-[#563d86]">{log.action}</span>
                <span className="text-xs text-[#66758d]">{formatTime(log.created_at)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-medium text-[#23344f]">
                  {log.user_name ?? "—"} <span className="font-normal text-[#66758d]">{log.user_email ?? ""}</span>
                </p>
                <p className="text-xs text-[#66758d]">
                  Entity: {log.entity_type ?? "—"}
                  {log.entity_id != null ? ` #${String(log.entity_id)}` : ""}
                </p>
                <p className="text-xs text-[#66758d]">IP: {log.ip_address ?? "—"}</p>
              </div>
              <div className="mt-3">
                {detailsRaw === null ? (
                  <p className="text-xs text-[#66758d]">—</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => needsTruncate && toggleExpand(log.id)}
                    className={`text-left font-mono text-xs ${needsTruncate ? "cursor-pointer hover:underline" : ""} text-[#23344f]`}
                  >
                    {truncated}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loadError && <p className="text-sm font-medium text-[#6b3d27]">{loadError}</p>}

      {logs.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-full bg-[#d9efff] px-6 py-2 text-sm font-bold text-[#315c86] hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
