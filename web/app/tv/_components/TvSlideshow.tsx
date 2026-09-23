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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
      setVisible(true);
      return;
    }
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [currentIndex, shouldAnimate]);

  // Keep index in bounds
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
    if (currentIndex >= announcements.length) setCurrentIndex(0);
  }, [announcements.length, currentIndex]);

  // Progress bar: animate 0→100 over 10s, reset on index change
  useEffect(() => {
    if (announcements.length <= 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop/timer sync; behavior preserved intentionally.
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

  const slideStyle = shouldAnimate
    ? {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    : undefined;

  if (announcements.length === 0) {
    return (
      <div
        className="relative flex min-h-screen w-full flex-col overflow-hidden"
        style={{ backgroundColor: "var(--color-dark)", color: "var(--color-surface)" }}
      >
        {/* Brand strip */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center text-sm font-extrabold"
              style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary-ink)" }}
            >
              NSH
            </div>
            <div>
              <p className="font-heading text-sm font-extrabold" style={{ color: "var(--color-surface)" }}>Nova Schola Hub</p>
              <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Official School Updates</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl font-bold tabular-nums sm:text-3xl" style={{ color: "var(--color-surface)" }}>{timeStr}</p>
            <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>{dateStr}</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <Megaphone size={40} strokeWidth={1.5} aria-hidden="true" className="mx-auto" style={{ color: "rgba(255, 255, 255, 0.35)" }} />
            <p className="tokens-heading-3 mt-6" style={{ color: "var(--color-surface)" }}>No announcements right now</p>
            <p className="tokens-small mt-2" style={{ color: "rgba(255, 255, 255, 0.55)" }}>Check back soon.</p>
          </div>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex % announcements.length];
  const trimmedContent = trimContent(current.content);
  const imageSrc = current.image_url ? resolveMediaUrl(current.image_url) : null;

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-dark)", color: "var(--color-surface)" }}
    >
      {/* Full-bleed image + flat legibility overlay */}
      {imageSrc && (
        <>
          <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-dark) 62%, transparent)" }}
          />
        </>
      )}

      {/* Brand strip */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center text-sm font-extrabold"
            style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary-ink)" }}
          >
            NSH
          </div>
          <div>
            <p className="font-heading text-sm font-extrabold" style={{ color: "var(--color-surface)" }}>Nova Schola Hub</p>
            <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Official School Updates</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-heading font-extrabold tabular-nums" style={{ color: "var(--color-surface)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1 }}>{timeStr}</p>
          <p className="mt-1 flex items-center justify-end gap-2 text-sm" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
            <Clock size={14} aria-hidden="true" />
            {dateStr}
          </p>
        </div>
      </div>

      {/* Slide */}
      <div className="relative z-10 flex flex-1 items-end px-6 pb-10 sm:px-12 sm:pb-14">
        <div
          key={shouldAnimate ? currentIndex : `no-anim-${currentIndex}`}
          className={shouldAnimate ? "transition-all" : ""}
          style={{ ...slideStyle, maxWidth: "1100px" }}
        >
          <p
            className="tokens-eyebrow"
            style={{ color: "var(--color-accent)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <span
              aria-hidden="true"
              style={{ width: "8px", height: "8px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--color-accent)" }}
            />
            Announcement {currentIndex + 1} of {announcements.length}
          </p>
          <h1
            className="font-heading break-words"
            style={{
              color: "var(--color-surface)",
              fontWeight: "var(--weight-display)",
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1.02,
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              marginTop: "var(--space-4)",
            }}
          >
            {current.title}
          </h1>
          <p
            className="break-words"
            style={{
              color: "rgba(255, 255, 255, 0.82)",
              fontSize: "clamp(1.125rem, 2.2vw, 1.5rem)",
              lineHeight: 1.6,
              marginTop: "var(--space-4)",
              maxWidth: "60ch",
            }}
          >
            {trimmedContent}
          </p>
        </div>
      </div>

      {/* Progress strip */}
      <div className="relative z-10 flex items-center gap-4 px-6 pb-6 sm:px-12">
        <span className="tokens-small tabular-nums" style={{ color: "rgba(255, 255, 255, 0.45)", minWidth: "48px" }}>
          {currentIndex + 1} / {announcements.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}>
          <div
            key={currentIndex}
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--color-accent)",
              transition: shouldAnimate && announcements.length > 1 ? "width 10s linear" : "none",
            }}
          />
        </div>
        <span className="tokens-small" style={{ color: "rgba(255, 255, 255, 0.45)", minWidth: "48px", textAlign: "right" }}>
          {!shouldAnimate ? "static" : ""}
        </span>
      </div>
    </div>
  );
}
