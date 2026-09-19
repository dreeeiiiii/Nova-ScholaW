"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, X as LucideX } from "lucide-react";
import ReviewModal from "./ReviewModal";

type Category = { id: number | string; name: string };

export default function UploadForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Revoke blob URL on change / unmount
  const prevPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      const url = previewUrl;
      prevPreviewRef.current = url;
      return () => {
        URL.revokeObjectURL(url);
      };
    }
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
  }, [previewUrl]);

  function validateFile(f: File): string | null {
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type === "video/mp4";

    if (isImage) {
      if (f.size > 10 * 1024 * 1024) return "Image too large. Maximum 10 MB.";
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        return "Invalid image type. Only JPEG, PNG, WebP allowed.";
      }
    } else if (isVideo) {
      if (f.size > 50 * 1024 * 1024) return "Video too large. Maximum 50 MB.";
    } else {
      return "Invalid file type. Only JPEG, PNG, WebP images and MP4 videos allowed.";
    }
    return null;
  }

  async function checkVideoDuration(f: File): Promise<string | null> {
    if (f.type !== "video/mp4") return null;
    const url = URL.createObjectURL(f);
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => resolve(video.duration);
        video.onerror = () => reject(new Error("Could not load video metadata"));
        video.src = url;
      });
      if (duration > 120) {
        return "Video too long. Maximum 2 minutes.";
      }
      return null;
    } catch {
      return "Could not validate video duration.";
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleFile(f: File | null) {
    setError("");
    if (!f) {
      setFile(null);
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setIsVideo(false);
      return;
    }

    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (f.type === "video/mp4") {
      const durErr = await checkVideoDuration(f);
      if (durErr) {
        setError(durErr);
        setFile(null);
        if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const blobUrl = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(blobUrl);
    setIsVideo(f.type === "video/mp4");
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    handleFile(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  function clearFile() {
    setFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!file) {
      setError("Please select a file.");
      return;
    }

    // Re-validate before submit (in case file changed after initial check)
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }

    setPending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category_id", categoryId);
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());

      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Upload failed");
        return;
      }

      // Success: show review modal and clear form
      setShowReview(true);
      // Clear form for next upload (but keep modal open)
      setTitle("");
      setCategoryId("");
      setDescription("");
      setFile(null);
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setIsVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="clay-card rounded-[2rem] p-6 sm:p-8" noValidate>
        {error && (
          <div role="alert" className="mb-4 rounded-2xl bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="gallery-title" className="block text-sm font-semibold text-text-main">
              Event name *
            </label>
            <input
              id="gallery-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Foundation Day 2026"
              className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="gallery-category" className="block text-sm font-semibold text-text-main">
              Category *
            </label>
            <select
              id="gallery-category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="gallery-description" className="block text-sm font-semibold text-text-main">
            Short description <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            id="gallery-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a caption shown in the gallery…"
            className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm"
          />
        </div>

        <div className="mt-4">
          <p className="block text-sm font-semibold text-text-main">File *</p>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`mt-1.5 flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-[#d9d7e2] bg-[#fdfaf3]"}`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${dragOver ? "bg-primary text-white" : "bg-white text-[#66758d]"}`}>
              <FileUp size={24} />
            </div>
            <p className="mt-3 text-sm font-semibold text-text-main">Drop a file here or choose a sample file</p>
            <p className="mt-1 text-xs text-text-muted">JPEG, PNG, WebP, MP4 · Images max 10 MB · Videos max 50 MB and 2 minutes</p>
            <label className="mt-4 cursor-pointer rounded-full bg-[#315c86] px-5 py-2 text-sm font-bold text-white">
              Choose file
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4"
                onChange={onFileInput}
                className="hidden"
              />
            </label>
            {file && <p className="mt-3 text-xs font-medium text-text-main">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
          </div>

          {previewUrl && (
            <div className="relative mt-4">
              {isVideo ? (
                <video src={previewUrl} controls className="max-h-64 w-full rounded-2xl bg-black" />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-h-64 w-full rounded-2xl object-contain bg-white" />
              )}
              <button
                type="button"
                onClick={clearFile}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white"
                aria-label="Remove file"
              >
                <LucideX size={14} />
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-[#315c86] px-6 py-3 text-sm font-bold text-white shadow disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Submit for review"}
        </button>
        <p className="mt-2 text-center text-xs text-text-muted">All uploads are reviewed by an admin before publishing.</p>
      </form>

      {showReview && (
        <ReviewModal
          onClose={() => {
            setShowReview(false);
          }}
        />
      )}
    </>
  );
}
