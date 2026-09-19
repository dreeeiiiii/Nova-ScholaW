"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import AudiencePicker from "./AudiencePicker";

type Targets = { section_ids: (number | string)[]; course_ids: (number | string)[]; student_ids: (number | string)[] };

type Props = {
  mode: "create" | "edit";
  initial?: {
    id?: number | string;
    title?: string;
    content?: string;
    type?: string;
    image_url?: string;
    publish_at?: string | null;
    expires_at?: string | null;
    targets?: Targets;
  };
};

export default function AnnouncementForm({ mode, initial }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [type, setType] = useState(initial?.type ?? "general");
  const [targets, setTargets] = useState<Targets>(
    initial?.targets ?? { section_ids: [], course_ids: [], student_ids: [] },
  );
  const [publishAt, setPublishAt] = useState(
    initial?.publish_at ? new Date(initial.publish_at).toISOString().slice(0, 16) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    initial?.expires_at ? new Date(initial.expires_at).toISOString().slice(0, 16) : "",
  );

  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [previewUrl, setPreviewUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [error, setError] = useState("");
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

  useEffect(() => {
    return () => {
      if (prevPreviewRef.current && prevPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(prevPreviewRef.current);
      }
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

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
        image_url: imageUrl || undefined,
        publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };
      if (isClass) {
        payload.section_ids = targets.section_ids;
        payload.course_ids = targets.course_ids;
        payload.student_ids = targets.student_ids;
      }

      const endpoint = isClass ? "/api/announcements/class" : "/api/announcements/general";
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

  const inputCls = "clay-input block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted";

  return (
    <div className="clay-card rounded-clay p-6">
      <h2 className="mb-4 font-heading text-lg font-bold text-text-main">
        {mode === "edit" ? "Edit Announcement" : "Create Announcement"}
      </h2>

      {error && (
        <div className="mb-4 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>
      )}
      {uploadError && (
        <div className="mb-4 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{uploadError}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="ann-title" className="block text-sm font-semibold text-text-main">
            Title *
          </label>
          <input
            id="ann-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className={`${inputCls} mt-1.5`}
          />
        </div>

        <div>
          <label htmlFor="ann-content" className="block text-sm font-semibold text-text-main">
            Content *
          </label>
          <textarea
            id="ann-content"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Announcement content"
            className={`${inputCls} mt-1.5`}
          />
        </div>

        <div>
          <p className="mb-2 block text-sm font-semibold text-text-main">Type</p>
          <div className="flex flex-wrap gap-3">
            {["general", "class"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-clay-pill px-5 py-2.5 text-sm font-bold transition-colors ${type === t ? "bg-primary text-white shadow-clay-sm" : "bg-surface text-text-muted hover:text-primary"}`}
              >
                {t === "general" ? "General" : "Class"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-text-main">Image</label>
          <input
            ref={fileInputRef}
            id="ann-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-text-muted file:mr-4 file:rounded-clay-pill file:border-0 file:bg-primary/15 file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary hover:file:bg-primary/25"
          />
          <p className="mt-1 text-xs text-text-muted">JPEG, PNG, or WebP. Max 10 MB.</p>
          {uploading && <p className="mt-2 text-xs text-text-muted">Uploading…</p>}
          {previewUrl && (
            <div className="relative mt-2">
              <img src={previewUrl} alt="Preview" className="h-48 rounded-clay object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-publish" className="block text-sm font-semibold text-text-main">
              Publish at (optional)
            </label>
            <input
              id="ann-publish"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className={`${inputCls} mt-1.5`}
            />
            <p className="mt-1 text-xs text-text-muted">Leave empty to publish immediately</p>
          </div>
          <div>
            <label htmlFor="ann-expires" className="block text-sm font-semibold text-text-main">
              Expires at (optional)
            </label>
            <input
              id="ann-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`${inputCls} mt-1.5`}
            />
          </div>
        </div>

        {isClass && <AudiencePicker value={targets} onChange={setTargets} />}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/announcements")}
            className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2.5 text-sm font-semibold text-text-main"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="clay-btn rounded-clay-pill bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-clay disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : type === "class" ? "Publish class announcement" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
