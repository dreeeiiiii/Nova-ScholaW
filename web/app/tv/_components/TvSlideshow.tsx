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

  // Respect prefers-reduced-motion
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const shouldAnimate = animate && !prefersReduced;

  // Clock
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll every 60s
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

  // Trigger fade/slide on index change when animating
  useEffect(() => {
    if (!shouldAnimate) return;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [currentIndex, shouldAnimate]);

  // Keep index in bounds when announcements change
  useEffect(() => {
    if (currentIndex >= announcements.length) setCurrentIndex(0);
  }, [announcements.length, currentIndex]);

  if (announcements.length === 0) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#1a1f2e] p-6 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Megaphone size={28} className="text-white/80" aria-hidden="true" />
          </div>
          <p className="font-heading text-2xl font-bold text-white">No announcements</p>
          <p className="mt-2 text-sm text-white/60">No announcements to display</p>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex % announcements.length];
  const timeStr = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#1a1f2e] text-white">
      {/* Clock top-right */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur">
          <Clock size={16} aria-hidden="true" />
          {timeStr}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-4xl text-center">
          <div
            key={shouldAnimate ? currentIndex : `no-anim-${currentIndex}`}
            className={shouldAnimate ? "transition-all duration-400 ease-out" : ""}
            style={
              shouldAnimate
                ? {
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(8px)",
                  }
                : undefined
            }
          >
            {current.image_url && (
              <img
                src={resolveMediaUrl(current.image_url)}
                alt=""
                className="mx-auto mb-6 max-h-64 w-auto rounded-2xl object-cover shadow-lg sm:max-h-80"
              />
            )}
            <h1 className="font-heading text-3xl font-extrabold text-white sm:text-5xl break-words">
              {current.title}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white/80 sm:text-2xl break-words">
              {current.content}
            </p>
          </div>

          <div className="mt-10">
            <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: `${((currentIndex + 1) / announcements.length) * 100}%`,
                  transition: shouldAnimate ? "width 0.4s ease-out" : "none",
                }}
              />
            </div>
            <p className="mt-2 text-sm text-white/60">
              {currentIndex + 1} of {announcements.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
