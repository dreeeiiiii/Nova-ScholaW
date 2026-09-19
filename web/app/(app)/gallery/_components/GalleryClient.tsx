"use client";

import { useEffect, useState } from "react";
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
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      router.replace(`?${params.toString()}`);
    }, 400);
    return () => clearTimeout(handle);
  }, [q, router, searchParams]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // keep q if present
    if (q.trim() && !params.has("q") && initialQ) {
      // already handled
    }
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="clay flex flex-col gap-3 rounded-3xl bg-[#fdfaf3] p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 shadow-[inset_4px_4px_9px_#d5d2cb,inset_-4px_-4px_9px_#fffdf7]">
            <Search size={16} className="text-text-muted" />
            <input
              id="gallery-search"
              type="search"
              placeholder="Search captions, filenames, categories…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-transparent p-3 text-sm outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select
            value={initialCategory}
            onChange={(e) => updateParam("category_id", e.target.value)}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm shadow-[inset_4px_4px_9px_#d5d2cb] outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={initialYear}
            onChange={(e) => updateParam("year", e.target.value)}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm shadow-[inset_4px_4px_9px_#d5d2cb] outline-none"
          >
            <option value="">All years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            {[
              { v: "", label: "All" },
              { v: "image", label: "Image" },
              { v: "video", label: "Video" },
            ].map((opt) => {
              const active = initialMediaType === opt.v;
              return (
                <button
                  key={opt.v || "all"}
                  type="button"
                  onClick={() => updateParam("media_type", opt.v)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-[#d9efff] text-[#23446c]" : "bg-white text-text-muted"}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-text-muted">{total} result{total === 1 ? "" : "s"}</p>

      <GalleryGrid media={media} />
    </div>
  );
}
