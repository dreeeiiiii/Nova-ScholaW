import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch, ApiError } from "@/lib/api";
import AuditLogTable from "./_components/AuditLogTable";
import { PageHeader } from "../../_components/PageHeader";

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

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity_type?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action : undefined;
  const entityType = typeof sp.entity_type === "string" ? sp.entity_type : undefined;
  const rawPage = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = 20;
  const offset = (page - 1) * 20;

  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (action) qs.set("action", action);
  if (entityType) qs.set("entity_type", entityType);

  let logs: AuditLog[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const data = (await serverFetch(`/api/audit-logs?${qs.toString()}`)) as {
      logs?: AuditLog[];
      total?: number;
    };
    logs = data.logs ?? [];
    total = data.total ?? 0;
  } catch (e) {
    error = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load audit logs";
  }

  if (error) {
    return (
      <div>
        <PageHeader
          eyebrow="Workspace"
          title="Audit Logs"
          description="Every write action across the app, newest first."
        />
        <div
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-small)",
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Audit Logs"
        description="Every write action across the app, newest first."
      />

      <AuditLogTable initialLogs={logs} initialTotal={total} action={action} entityType={entityType} />
    </div>
  );
}
