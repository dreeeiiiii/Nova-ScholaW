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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
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
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Announcement details"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 40%, transparent)" }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-large)" }}>
        <div className="flex items-start justify-between gap-4" style={{ borderBottom: "1px solid var(--color-line)", paddingBottom: "var(--space-4)" }}>
          <div>
            {data && (
              <span
                className="tokens-small"
                style={{
                  display: "inline-block",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px var(--space-3)",
                  fontWeight: 700,
                  fontSize: "0.6875rem",
                  letterSpacing: "0.08em",
                  backgroundColor: data.announcement.type === "general" ? "var(--color-info-bg)" : "var(--color-primary-soft)",
                  color: data.announcement.type === "general" ? "var(--color-info)" : "var(--color-primary-ink)",
                }}
              >
                {data.announcement.type === "general" ? "GENERAL · PUBLIC" : "CLASS · PRIVATE"}
              </span>
            )}
            <h2 className="tokens-heading-3 mt-3" style={{ color: "var(--color-text)" }}>
              {loading ? "Loading…" : data?.announcement.title ?? ""}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] p-2"
            style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-line)", color: "var(--color-text)" }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading && <p className="tokens-small mt-4" style={{ color: "var(--color-muted)" }}>Loading announcement…</p>}
        {error && <p className="tokens-small mt-4 font-medium" style={{ color: "var(--color-danger)" }}>{error}</p>}

        {data && !loading && !error && (
          <>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>{data.announcement.content}</p>

            {data.targets.length > 0 && (
              <div className="mt-5">
                <h3 className="tokens-eyebrow" style={{ color: "var(--color-muted)" }}>Audience</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.targets.map((t) => {
                    const label =
                      t.section_name ?? t.course_name ?? t.student_full_name ?? `${t.target_type} #${t.id}`;
                    const sub =
                      t.target_type === "student" && t.student_email ? t.student_email : t.target_type;
                    return (
                      <span key={String(t.id)} className="text-xs font-semibold" style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary-ink)", padding: "var(--space-1) var(--space-3)" }}>
                        {label} <span className="ml-1 text-[10px] uppercase" style={{ color: "var(--color-muted)" }}>{sub}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {data.targets.length === 0 && data.announcement.type === "class" && (
              <p className="tokens-small mt-5" style={{ color: "var(--color-muted)" }}>No audience targets.</p>
            )}

            <div className="tokens-small mt-5" style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-3)", color: "var(--color-muted)" }}>
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
