"use client";
/* eslint-disable @next/next/no-img-element -- Preoptimized NST WebP and signed B2 URLs use direct media delivery. */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { nstImages } from "@/lib/nst-images";
import { resolveMediaUrl } from "@/lib/url";
import { loadTvAnnouncements, type TvAnnouncement } from "@/lib/tv-announcements";
import styles from "./tv.module.css";

const DURATION = 10000;
function excerpt(content: string) {
  // Historical date and demo context are displayed separately on signage.
  const copy = content.split("\n").filter(line => !line.startsWith("Source:") && !line.startsWith("Illustrative school image") && !line.startsWith("Demo display •")).join("\n");
  if (copy.length <= 420) return copy;
  return copy.slice(0, 420).replace(/\s+\S*$/, "") + "…";
}

export default function TvSlideshow({ initialAnnouncements, animate }: {
  initialAnnouncements: TvAnnouncement[]; animate: boolean;
}) {
  const [rows, setRows] = useState(initialAnnouncements);
  const [frame, setFrame] = useState({ index: 0, elapsed: 0, now: null as Date | null });
  const lastTick = useRef(0);
  const eligible = rows.filter(a => a.type === "general" && a.status === "published" &&
    (!frame.now || ((!a.publish_at || Date.parse(a.publish_at) <= frame.now.getTime()) &&
    (!a.expires_at || Date.parse(a.expires_at) > frame.now.getTime()))));
  const count = eligible.length;

  useEffect(() => {
    lastTick.current = performance.now();
    const resume = () => { lastTick.current = performance.now(); };
    document.addEventListener("visibilitychange", resume);
    const timer = setInterval(() => {
      const now = performance.now(), delta = now - lastTick.current;
      lastTick.current = now;
      if (document.hidden) return;
      setFrame(previous => {
        const elapsed = previous.elapsed + delta;
        return { index: count > 1 && elapsed >= DURATION ? (previous.index + 1) % count : previous.index,
          elapsed: count > 1 ? elapsed % DURATION : 0, now: new Date() };
      });
    }, 100);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, [count]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const announcements = await loadTvAnnouncements(async offset => {
          const res = await fetch("/api/announcements/tv?limit=100&offset=" + offset,
            { cache: "no-store", signal: controller.signal });
          if (!res.ok) throw new Error("TV refresh failed");
          return res.json();
        });
        if (!controller.signal.aborted) setRows(announcements);
      } catch { /* Keep the last successful feed; expiry is still enforced locally. */ }
    };
    const timer = setInterval(refresh, 30000);
    const resume = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", resume);
    return () => { clearInterval(timer); controller.abort(); document.removeEventListener("visibilitychange", resume); };
  }, []);

  const index = count ? frame.index % count : 0;
  const current = eligible[index];
  const image = current?.image_url ? resolveMediaUrl(current.image_url) : nstImages.community.src.src;
  const next = Array.from({ length: Math.min(3, Math.max(0, count - 1)) },
    (_, i) => eligible[(index + i + 1) % count]);
  return <div className={styles.screen}>
    <header className={styles.header}>
      <div className={styles.brand}><Image src={nstImages.mark.src} alt="NST" width={64} height={64} />
        <div><p>Nova Schola Hub</p><span>Nova Schola Tanauan</span></div></div>
      <p className={styles.heading}>ANNOUNCEMENTS</p>
      <div className={styles.clock}>
        <time>{frame.now?.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) ?? "--:--"}</time>
        <p>{frame.now?.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) ?? ""}</p>
      </div>
    </header>
    <section key={current?.id ?? "empty"} className={styles.feature + (animate ? " " + styles.enter : "")} aria-label="Current announcement">
      <figure className={styles.visual}>
        <img key={image} src={image} alt={current ? current.title : nstImages.community.alt}
          onError={event => { if (!event.currentTarget.src.endsWith(nstImages.community.src.src)) event.currentTarget.src = nstImages.community.src.src; }} />
        <figcaption>{current?.display_import ? "Official NST imagery · Demo display" : "Nova Schola Tanauan"}</figcaption>
      </figure>
      <div className={styles.copy}>
        <p className={styles.badge}>{current ? "General Announcement" : "Nova Schola Hub"}</p>
        <h1>{current?.title ?? "No active announcements at this time."}</h1>
        <p className={styles.body}>{current ? excerpt(current.content) : "Please stay tuned for the latest Nova Schola Tanauan updates."}</p>
        {current && <p className={styles.date}>{current.display_import && !current.publish_at ? "Official NST resource · Undated" : (current.display_import ? "Originally published · " : "Published · ") + new Date(current.publish_at ?? current.created_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</p>}
      </div>
    </section>
    <footer className={styles.footer}>
      <div className={styles.counter}><span>{count ? String(index + 1).padStart(2, "0") : "00"}</span> / {String(count).padStart(2, "0")}<p>{count ? "School bulletin" : "Stay connected"}</p></div>
      <div className={styles.next}><p>NEXT</p>{next.map((a,i) => <div key={a.id}><span>{String(i + 1).padStart(2,"0")}</span><p>{a.title}</p></div>)}</div>
      <p className={styles.motto}>Aim High.<br />Go Global.</p>
    </footer>
    <div className={styles.progress} role="progressbar" aria-label="Announcement rotation" aria-valuenow={Math.round(count > 1 ? frame.elapsed / DURATION * 100 : 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: (count > 1 ? frame.elapsed / DURATION * 100 : 100) + "%" }} />
    </div>
  </div>;
}
