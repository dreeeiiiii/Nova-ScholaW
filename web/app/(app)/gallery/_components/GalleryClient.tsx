"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import GalleryGrid from "./GalleryGrid";

type Media = {
  id: number | string;
  caption?: string;
  file_url: string;
  media_type: string;
  category_name?: string;
  created_at?: string;
  original_filename?: string;
};

type Category = { id: number | string; name: string };

type Props = {
  media: Media[];
  total: number;
  categories: Category[];
  initialQ: string;
  initialCategory: string;
  initialYear: string;
  initialMediaType: string;
  pendingCount?: number;
  rejectedCount?: number;
};

const YEAR_OPTIONS = ["2024", "2025", "2026", "2027"];

export default function GalleryClient({
  media,
  total,
  categories,
  initialQ,
  initialCategory,
  initialYear,
  initialMediaType,
  pendingCount = 0,
  rejectedCount = 0,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [isPending, startTransition] = useTransition();
  const [optimisticCategory, setOptimisticCategory] = useState<string | null>(null);
  const [optimisticYear, setOptimisticYear] = useState<string | null>(null);
  const [optimisticMediaType, setOptimisticMediaType] = useState<string | null>(null);
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setQ(initialQ);
  }, [initialQ]);

  // Clear optimistic selections once the server confirms the new filters
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    setOptimisticCategory(null);
    setOptimisticYear(null);
    setOptimisticMediaType(null);
  }, [initialCategory, initialYear, initialMediaType]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const trimmed = q.trim();
      const urlQ = params.get("q") ?? "";
      if (trimmed === urlQ) return;
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      startTransition(() => {
        router.replace(`?${params.toString()}`);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, router]);

  function updateParam(key: string, value: string) {
    const current = searchParams.get(key) ?? "";
    if (current === value) return;
    if (key === "category_id") setOptimisticCategory(value || null);
    if (key === "year") setOptimisticYear(value || null);
    if (key === "media_type") setOptimisticMediaType(value || null);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      // keep q if present
      if (q.trim() && !params.has("q") && initialQ) {
        // already handled
      }
      router.replace(`?${params.toString()}`);
    });
  }

  const activeCategory = optimisticCategory ?? initialCategory;
  const activeYear = optimisticYear ?? initialYear;
  const activeMediaType = optimisticMediaType ?? initialMediaType;

  return (
    <div>
      {pendingCount > 0 && (
        <div
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-small)",
            backgroundColor: "var(--color-warning-bg)",
            color: "var(--color-warning)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          {pendingCount} upload{pendingCount > 1 ? "s" : ""} awaiting review.{" "}
          <Link href="/gallery/mine" className="font-bold underline">
            View your uploads
          </Link>
        </div>
      )}
      {rejectedCount > 0 && (
        <div
          className="tokens-small"
          style={{
            borderRadius: "var(--radius-small)",
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          {rejectedCount} upload{rejectedCount > 1 ? "s" : ""} rejected.{" "}
          <Link href="/gallery/mine" className="font-bold underline">
            View your uploads
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative flex-1 lg:max-w-md">
          <label className="sr-only" htmlFor="gallery-search">
            Search gallery
          </label>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-muted)" }}
          />
          <input
            id="gallery-search"
            type="search"
            placeholder="Search captions, filenames, categories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-token"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            aria-label="Filter by category"
            value={activeCategory}
            onChange={(e) => updateParam("category_id", e.target.value)}
            className="input-token sm:w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by year"
            value={activeYear}
            onChange={(e) => updateParam("year", e.target.value)}
            className="input-token sm:w-auto"
          >
            <option value="">All years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div
            className="flex gap-6"
            role="tablist"
            aria-label="Filter by media type"
            style={{ borderBottom: "1px solid var(--color-line)" }}
          >
            {[
              { v: "", label: "All" },
              { v: "image", label: "Image" },
              { v: "video", label: "Video" },
            ].map((opt) => {
              const active = activeMediaType === opt.v;
              return (
                <button
                  key={opt.v || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => updateParam("media_type", opt.v)}
                  className="inline-flex min-h-[44px] items-center text-sm font-bold transition-colors duration-200 motion-reduce:transition-none"
                  style={{
                    color: active ? "var(--color-text)" : "var(--color-muted)",
                    boxShadow: active ? "inset 0 -2px 0 var(--color-primary)" : "none",
                    paddingInline: "2px",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p className="tokens-small" style={{ color: "var(--color-muted)" }}>
          {total} result{total === 1 ? "" : "s"}
        </p>
        {isPending && (
          <span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }} role="status" aria-live="polite">
            <span
              className="inline-block h-2 w-2 animate-pulse"
              aria-hidden="true"
              style={{ borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-primary)" }}
            />
            Updating…
          </span>
        )}
      </div>

      <div
        className="transition-opacity duration-200 motion-reduce:transition-none"
        style={{ marginTop: "var(--space-4)", opacity: isPending ? 0.6 : 1 }}
        aria-busy={isPending}
      >
        <GalleryGrid media={media} />
      </div>
    </div>
  );
}
