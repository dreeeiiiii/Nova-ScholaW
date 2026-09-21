"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Target = {
  id: number | string;
  target_type: string;
  section_id?: number | null;
  course_id?: number | null;
  student_id?: number | null;
  section_name?: string | null;
  course_name?: string | null;
  student_full_name?: string | null;
  student_email?: string | null;
};

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  type: string;
  status?: string;
  publish_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  image_url?: string | null;
  author_name?: string;
};

export default function AnnouncementDetailModal({
  openId,
  onClose,
}: {
  openId: number | string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ announcement: Announcement; targets: Target[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (openId === null) {
      setData(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/announcements/${encodeURIComponent(String(openId))}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Failed to load");
        return json;
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [openId]);

  // Focus management: focus close button on open
  useEffect(() => {
    if (openId !== null) {
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [openId]);

  // Escape + focus trap
  useEffect(() => {
    if (openId === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openId, onClose]);

  if (openId === null) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Announcement details"
    >
      <div className="clay max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#fdfaf3] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {data && (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${data.announcement.type === "general" ? "bg-[#d9efff] text-[#23446c]" : "bg-[#e7defb] text-[#563d86]"}`}
              >
                {data.announcement.type === "general" ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
              </span>
            )}
            <h2 className="mt-3 font-heading text-xl font-bold text-[#23344f]">
              {loading ? "Loading…" : data?.announcement.title ?? ""}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl bg-white p-2 shadow focus:outline-none focus:ring-2 focus:ring-[#315c86] focus:ring-offset-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading && <p className="mt-4 text-sm text-text-muted">Loading announcement…</p>}
        {error && <p className="mt-4 text-sm font-medium text-danger">{error}</p>}

        {data && !loading && !error && (
          <>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#23344f]">{data.announcement.content}</p>

            {data.targets.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">Audience</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.targets.map((t) => {
                    const label =
                      t.section_name ?? t.course_name ?? t.student_full_name ?? `${t.target_type} #${t.id}`;
                    const sub =
                      t.target_type === "student" && t.student_email ? t.student_email : t.target_type;
                    return (
                      <span key={String(t.id)} className="rounded-full bg-[#e7defb] px-3 py-1 text-xs font-semibold text-[#563d86]">
                        {label} <span className="ml-1 text-[10px] uppercase text-[#66758d]">{sub}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {data.targets.length === 0 && data.announcement.type === "class" && (
              <p className="mt-5 text-xs text-text-muted">No audience targets.</p>
            )}

            <div className="mt-5 border-t border-[#e7defb] pt-3 text-xs text-text-muted">
              {data.announcement.status && <span>Status: {data.announcement.status} · </span>}
              {data.announcement.publish_at && (
                <span>Publish: {new Date(data.announcement.publish_at).toLocaleString()} · </span>
              )}
              {data.announcement.expires_at && (
                <span>Expires: {new Date(data.announcement.expires_at).toLocaleString()} · </span>
              )}
              {data.announcement.created_at && (
                <span>Created: {new Date(data.announcement.created_at).toLocaleString()}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
