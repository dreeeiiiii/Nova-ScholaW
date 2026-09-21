import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch, ApiError } from "@/lib/api";
import AuditLogTable from "./_components/AuditLogTable";

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
      <div className="space-y-6">
        <div>
          <span className="text-sm font-bold text-[#315c86]">ROLE-AWARE WORKSPACE</span>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Audit Logs</h1>
          <p className="mt-2 text-sm text-[#66758d]">Every write action across the app, newest first.</p>
        </div>
        <div className="rounded-2xl bg-[#ffe1d1] px-4 py-3 text-sm font-medium text-[#6b3d27]">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm font-bold text-[#315c86]">ROLE-AWARE WORKSPACE</span>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-[#23344f]">Audit Logs</h1>
        <p className="mt-2 text-sm text-[#66758d]">Every write action across the app, newest first.</p>
      </div>

      <AuditLogTable initialLogs={logs} initialTotal={total} action={action} entityType={entityType} />
    </div>
  );
}
