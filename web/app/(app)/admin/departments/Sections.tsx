"use client";
import { useEffect, useState } from "react";
import { notifySectionsChanged, subscribeSectionChanges } from "@/lib/section-sync";
import { Dialog } from "../../../_components/ui/Dialog";
type Section = { id: string | number; name: string; grade_level: string; student_count: number };
export default function Sections({ departmentId }: { departmentId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState<Section | null>(null);
  async function load() {
    const response = await fetch(`/api/sections?department_id=${departmentId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Cannot load sections.");
    setSections(data.sections ?? []);
  }
  useEffect(() => {
    let cancelled = false, requestId = 0;
    async function refresh() {
      const current = ++requestId;
      try {
        const response = await fetch(`/api/sections?department_id=${departmentId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Cannot load sections.");
        if (!cancelled && current === requestId) setSections(data.sections ?? []);
      } catch (error) { if (!cancelled && current === requestId) setError(error instanceof Error ? error.message : "Cannot load sections."); }
      finally { if (!cancelled && current === requestId) setLoading(false); }
    }
    void refresh();
    const unsubscribe = subscribeSectionChanges(() => { void refresh(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [departmentId]);
  async function mutate(url: string, method: string, body?: unknown) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Operation failed.");
      await load();
      notifySectionsChanged();
      setMessage(method === "POST" ? "Section created." : method === "PUT" ? "Section updated." : "Section deleted.");
      return true;
    } catch (error) { setError(error instanceof Error ? error.message : "Operation failed."); return false; }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    if (await mutate("/api/sections", "POST", { name: data.get("name"), grade_level: data.get("grade_level"), department_id: departmentId })) form.reset();
  }
  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; const data = new FormData(event.currentTarget);
    if (await mutate(`/api/sections/${editing.id}`, "PUT", { name: data.get("name"), grade_level: data.get("grade_level"), department_id: departmentId })) setEditing(null);
  }
  return <div>
    <h3 className="text-lg font-bold">Sections</h3>
    {loading && <p role="status">Loading sections...</p>}
    {!loading && !error && sections.length === 0 && <p className="my-3" style={{ color: "var(--color-muted)" }}>No sections in this department yet.</p>}
    {message && <p role="status" className="my-3" style={{ color: "var(--color-success)" }}>{message}</p>}
    {error && !editing && !deleting && <p role="alert" className="my-3" style={{ color: "var(--color-danger)" }}>{error}</p>}
    <ul>{sections.map(section => <li key={section.id} className="section-record"><div className="font-bold">{section.name}</div><p className="tokens-small" style={{ color: "var(--color-muted)" }}>{section.grade_level} · {section.student_count} active Students</p><div className="mt-3 flex gap-3"><button type="button" disabled={busy} className="tokens-btn tokens-btn-secondary !px-5" onClick={() => { setError(""); setEditing(section); }}>Edit</button><button type="button" disabled={busy} className="tokens-btn tokens-btn-secondary !px-5" onClick={() => { setError(""); setDeleting(section); }}>Delete</button></div></li>)}</ul>
    <form onSubmit={save} className="sections-form mt-6 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1"><span className="label-token">Section name</span><input name="name" className="input-token" required maxLength={100} /></label><label className="min-w-0 flex-1"><span className="label-token">Grade / year level</span><input name="grade_level" className="input-token" required maxLength={20} /></label><button disabled={busy} className="tokens-btn tokens-btn-primary">{busy ? "Saving..." : "Create Section"}</button></form>
    {editing && <Dialog label="Edit section" onClose={() => setEditing(null)}><form onSubmit={update} className="p-6 space-y-4"><h2 className="tokens-heading-3">Edit section</h2><label className="block"><span className="label-token">Section name</span><input name="name" className="input-token" defaultValue={editing.name} required maxLength={100} /></label><label className="block"><span className="label-token">Grade / year level</span><input name="grade_level" className="input-token" defaultValue={editing.grade_level} required maxLength={20} /></label>{error && <p role="alert" style={{ color: "var(--color-danger)" }}>{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setEditing(null)} className="tokens-btn tokens-btn-secondary">Cancel</button><button disabled={busy} className="tokens-btn tokens-btn-primary">{busy ? "Saving..." : "Save changes"}</button></div></form></Dialog>}
    {deleting && <Dialog label="Delete section" onClose={() => setDeleting(null)}><div className="p-6 space-y-4"><h2 className="tokens-heading-3">Delete section?</h2><p>{deleting.name}</p><p style={{ color: "var(--color-muted)" }}>Only unassigned sections can be deleted. Referenced sections are protected.</p>{error && <p role="alert" style={{ color: "var(--color-danger)" }}>{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setDeleting(null)} className="tokens-btn tokens-btn-secondary">Cancel</button><button disabled={busy} className="tokens-btn tokens-btn-primary" onClick={async () => { if (await mutate(`/api/sections/${deleting.id}`, "DELETE")) setDeleting(null); }}>{busy ? "Deleting..." : "Delete Section"}</button></div></div></Dialog>}
  </div>;
}
