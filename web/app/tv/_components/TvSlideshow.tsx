"use client";

import { useEffect, useState } from "react";
import { Clock, Megaphone } from "lucide-react";
import { resolveMediaUrl } from "@/lib/url";

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  image_url?: string | null;
  created_at: string;
};

function trimContent(text: string, max = 250): string {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > 0) return sliced.slice(0, lastSpace) + "…";
  return sliced + "…";
}

export default function TvSlideshow({
  initialAnnouncements,
  animate,
}: {
  initialAnnouncements: Announcement[];
  animate: boolean;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [time, setTime] = useState<Date | null>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const shouldAnimate = animate && !prefersReduced;

  // Clock 1s
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll 60s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/announcements/tv");
        if (!res.ok) return;
        const data = await res.json();
        setAnnouncements(data.announcements ?? []);
      } catch {}
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Auto-advance 10s
  useEffect(() => {
    if (announcements.length <= 1) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 10000);
    return () => clearInterval(id);
  }, [announcements.length]);

  // Trigger fade/slide on index change
  useEffect(() => {
    if (!shouldAnimate) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [currentIndex, shouldAnimate]);

  // Keep index in bounds
  useEffect(() => {
    if (currentIndex >= announcements.length) setCurrentIndex(0);
  }, [announcements.length, currentIndex]);

  // Progress bar: animate 0→100 over 10s, reset on index change
  useEffect(() => {
    if (announcements.length <= 1) {
      setProgress(100);
      return;
    }
    if (!shouldAnimate) {
      setProgress(100);
      return;
    }
    setProgress(0);
    const raf = requestAnimationFrame(() => {
      // double raf to ensure transition triggers
      requestAnimationFrame(() => setProgress(100));
    });
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, announcements.length, shouldAnimate]);

  const timeStr = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const dateStr = time
    ? time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "";

  if (announcements.length === 0) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[#315c86] opacity-20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-[#e7defb] opacity-20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9efff] opacity-20 blur-3xl" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9efff] text-sm font-extrabold text-[#315c86]">
              NSH
            </div>
            <div>
              <p className="font-heading text-sm font-extrabold text-white">Nova Schola Hub</p>
              <p className="text-xs text-white/60">Official School Updates</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl font-bold tabular-nums text-white sm:text-3xl">{timeStr}</p>
            <p className="text-xs text-white/60">{dateStr}</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-md shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5">
              <Megaphone size={48} className="text-white/30" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">No announcements right now</h1>
            <p className="mt-2 text-sm text-white/50">Check back soon.</p>
          </div>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex % announcements.length];
  const trimmedContent = trimContent(current.content);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[#315c86] opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-[#e7defb] opacity-20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9efff] opacity-20 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9efff] text-sm font-extrabold text-[#315c86]">
            NSH
          </div>
          <div>
            <p className="font-heading text-sm font-extrabold text-white">Nova Schola Hub</p>
            <p className="text-xs text-white/60">Official School Updates</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-heading text-6xl font-extrabold tabular-nums text-white sm:text-7xl">{timeStr}</p>
          <p className="mt-1 flex items-center justify-end gap-2 text-sm text-white/60">
            <Clock size={14} aria-hidden="true" />
            {dateStr}
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            {current.image_url ? (
              <>
                <div className="relative">
                  <img
                    src={resolveMediaUrl(current.image_url)}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
                </div>
                <div
                  key={shouldAnimate ? currentIndex : `no-anim-${currentIndex}`}
                  className={shouldAnimate ? "transition-all" : ""}
                  style={
                    shouldAnimate
                      ? {
                          opacity: visible ? 1 : 0,
                          transform: visible ? "translateY(0)" : "translateY(8px)",
                          transitionDuration: "600ms",
                          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                        }
                      : undefined
                  }
                >
                  <div className="p-8 sm:p-12">
                    <h1 className="font-heading text-4xl font-extrabold leading-tight text-white sm:text-5xl break-words">
                      {current.title}
                    </h1>
                    <p className="mt-4 text-lg leading-relaxed text-white/80 sm:text-2xl break-words">
                      {trimmedContent}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div
                key={shouldAnimate ? currentIndex : `no-anim-${currentIndex}`}
                className={`p-8 sm:p-12 text-center ${shouldAnimate ? "transition-all" : ""}`}
                style={
                  shouldAnimate
                    ? {
                        opacity: visible ? 1 : 0,
                        transform: visible ? "translateY(0)" : "translateY(8px)",
                        transitionDuration: "600ms",
                        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                      }
                    : undefined
                }
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                  <Megaphone size={48} className="text-white/20" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-4xl font-extrabold leading-tight text-white sm:text-5xl break-words">
                  {current.title}
                </h1>
                <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white/80 sm:text-2xl break-words">
                  {trimmedContent}
                </p>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-sm text-white/40">
              {currentIndex + 1} / {announcements.length}
            </span>
            <div className="flex-1 mx-4 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                key={currentIndex}
                className="h-full rounded-full bg-[#d9efff]"
                style={{
                  width: `${progress}%`,
                  transition: shouldAnimate && announcements.length > 1 ? "width 10s linear" : "none",
                }}
              />
            </div>
            <span className="text-sm text-white/40 min-w-[40px] text-right">
              {!shouldAnimate ? "static" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
