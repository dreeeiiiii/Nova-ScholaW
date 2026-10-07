"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import AudiencePicker from "./AudiencePicker";

function toLocalInput(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

type Targets = { section_ids: (number | string)[]; course_ids: (number | string)[]; student_ids: (number | string)[] };

type Props = {
  mode: "create" | "edit";
  role: "admin" | "teacher";
  initial?: {
    id?: number | string;
    title?: string;
    content?: string;
    type?: string;
    department_id?: number | string | null;
    b2_key?: string | null;
    image_url?: string;
    publish_at?: string | null;
    expires_at?: string | null;
    targets?: Targets;
    show_on_tv?: boolean;
  };
};

export default function AnnouncementForm({ mode, initial, role }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [type, setType] = useState(initial?.type ?? (role === "teacher" ? "class" : "general"));
  const [targets, setTargets] = useState<Targets>(
    initial?.targets ?? { section_ids: [], course_ids: [], student_ids: [] },
  );
  const [publishAt, setPublishAt] = useState(
    initial?.publish_at ? toLocalInput(initial.publish_at) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    initial?.expires_at ? toLocalInput(initial.expires_at) : "",
  );

  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [b2Key, setB2Key] = useState((initial as { b2_key?: string })?.b2_key ?? "");
  const [departmentId, setDepartmentId] = useState(String(initial?.department_id ?? ""));
  const [departments, setDepartments] = useState<{id: string; name: string}[]>([]);
  const [previewUrl, setPreviewUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/auth/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? [])).catch(() => setError("Cannot load departments.")); }, []);
  const [saving, setSaving] = useState(false);

  const isClass = type === "class";

  // Revoke object URL on unmount or when preview changes
  const prevPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    // if previewUrl is object URL (blob:), track for revoke
    if (previewUrl && previewUrl.startsWith("blob:")) {
      const url = previewUrl;
      prevPreviewRef.current = url;
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    // if previous was blob and now changed to something else, revoke
    if (prevPreviewRef.current && prevPreviewRef.current !== previewUrl) {
      URL.revokeObjectURL(prevPreviewRef.current);
      prevPreviewRef.current = null;
    }
  }, [previewUrl]);



  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError("");
    if (!file) {
      setPreviewUrl(imageUrl);
      return;
    }

    // Validate before upload
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Only JPEG, PNG, WebP allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image too large. Maximum 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Revoke previous blob
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);

    // Upload immediately
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/announcements/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.message || "Upload failed");
        setPreviewUrl(imageUrl);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setImageUrl(data.image_url || "");
      setB2Key((data as { b2_key?: string }).b2_key || "");
      // keep preview as blob for UI, but store imageUrl for submit
    } catch {
      setUploadError("Upload failed");
      setPreviewUrl(imageUrl);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setImageUrl("");
    setB2Key("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    if (type === "department" && !departmentId) { setError("Select a department."); return; }
    if (isClass) {
      const total = targets.section_ids.length + targets.course_ids.length + targets.student_ids.length;
      if (total === 0) {
        setError("Select at least one audience");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl || null,
        b2_key: b2Key || null,
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      if (isClass) {
        payload.show_on_tv = false;
        payload.section_ids = targets.section_ids;
        payload.course_ids = targets.course_ids;
        payload.student_ids = targets.student_ids;
      } else {
        if (type === "department") payload.department_id = Number(departmentId);
      }

      const endpoint = "/api/announcements/" + type;
      const method = mode === "edit" && initial?.id ? "PUT" : "POST";
      const url =
        mode === "edit" && initial?.id ? `/api/announcements/${encodeURIComponent(String(initial.id))}` : endpoint;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to create announcement.");
        return;
      }

      router.push("/announcements");
      router.refresh();
    } catch {
      setError("Failed to create announcement.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "input-token";

  return (
    <div>
      {error && (
        <div className="mb-4 tokens-small" style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>{error}</div>
      )}
      {uploadError && (
        <div className="mb-4 tokens-small" style={{ borderRadius: "var(--radius-small)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>{uploadError}</div>
      )}

      <form onSubmit={onSubmit} className="composer-form space-y-4" noValidate>
        <h2 className="tokens-heading-3">Write your update</h2>
        <div>
          <label htmlFor="ann-title" className="label-token">
            Title *
          </label>
          <input
            id="ann-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="ann-content" className="label-token">
            Content *
          </label>
          <textarea
            id="ann-content"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Announcement content"
            className={inputCls}
          />
        </div>

        <div>
          <p className="label-token">Type</p>
          <div className="flex gap-6" style={{ borderBottom: "1px solid var(--color-line)" }}>
            {(mode === "edit" ? [type] : role === "teacher" ? ["class"] : ["general", "department"]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className="inline-flex min-h-[44px] items-center text-sm font-bold transition-colors duration-200 motion-reduce:transition-none"
                style={{
                  color: type === t ? "var(--color-text)" : "var(--color-muted)",
                  boxShadow: type === t ? "inset 0 -2px 0 var(--color-primary)" : "none",
                  paddingInline: "2px",
                }}
              >
                {t === "general" ? "General" : t === "department" ? "Department" : "Class"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ann-image-file" className="label-token">Image</label>
          <input
            ref={fileInputRef}
            id="ann-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm min-h-[44px]"
            style={{ color: "var(--color-muted)" }}
          />
          <p className="tokens-small mt-1" style={{ color: "var(--color-muted)" }}>JPEG, PNG, or WebP. Max 10 MB.</p>
          {uploading && <p className="tokens-small mt-2" style={{ color: "var(--color-muted)" }}>Uploading…</p>}
          {previewUrl && (
            <div className="relative mt-2 inline-block">
              <img src={previewUrl} alt="Preview" className="h-48 rounded-xl object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center"
                style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-danger)", color: "var(--color-surface)" }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-publish" className="label-token">
              Publish at (optional)
            </label>
            <input
              id="ann-publish"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className={inputCls}
            />
            <p className="tokens-small mt-1" style={{ color: "var(--color-muted)" }}>Leave empty to publish immediately</p>
          </div>
          <div>
            <label htmlFor="ann-expires" className="label-token">
              Expires at (optional)
            </label>
            <input
              id="ann-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {type === "general" && <p className="tokens-small">School-wide; displayed on the public homepage, dashboards, and TV.</p>}
        {type === "department" && <label className="block"><span className="label-token">Department *</span><select aria-label="Department *" className={inputCls} value={departmentId} onChange={e => setDepartmentId(e.target.value)} required><option value="">Select department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}

        {isClass && <section className="composer-audience" aria-labelledby="audience-title"><h2 id="audience-title" className="tokens-heading-3 mb-4">Who should receive this?</h2><AudiencePicker value={targets} onChange={setTargets} /></section>}

        <div className="composer-actions flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/announcements")}
            className="tokens-btn tokens-btn-secondary w-full text-sm sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="tokens-btn tokens-btn-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : type === "class" ? "Publish class announcement" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
