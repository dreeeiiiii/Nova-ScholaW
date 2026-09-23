"use client";

import { useEffect, useRef, useState } from "react";

export type StatisticItem = {
  index?: string;
  value: string | number;
  suffix?: string;
  label: string;
  description?: string;
};

type StatisticsProps = {
  items: StatisticItem[];
  columns?: 2 | 3 | 4;
  align?: "left" | "center";
};

const COUNT_DURATION = 500;

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/** "500+" → { numeric: 500, affix: "+" }; non-numeric strings pass through. */
function splitAffix(raw: string): { numeric: number | null; affix: string; decimals: number } {
  const match = raw.match(/^(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return { numeric: null, affix: "", decimals: 0 };
  const numeric = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(numeric)) return { numeric: null, affix: "", decimals: 0 };
  return {
    numeric,
    affix: match[2],
    decimals: match[1].includes(".") ? match[1].split(".")[1].length : 0,
  };
}

function StatValue({ value, suffix = "" }: { value: string | number; suffix?: string }) {
  const target = typeof value === "number" ? String(value) : value;
  const { numeric, affix, decimals } = splitAffix(target);
  const finalText = `${target}${suffix}`;
  const [text, setText] = useState(finalText);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || numeric === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let done = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || done) continue;
          done = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - t0) / COUNT_DURATION);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = numeric * eased;
            setText(
              `${current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${affix}${suffix}`
            );
            if (t < 1) raf = requestAnimationFrame(tick);
            else setText(finalText);
          };
          raf = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [numeric, affix, decimals, suffix, finalText]);

  return <span ref={ref}>{text}</span>;
}

/**
 * Dominant editorial numbers — flat composition, no cards/borders/boxes.
 * Numeric values count up once on scroll (500ms ease-out);
 * reduced motion shows the final value instantly.
 */
export function Statistics({ items, columns = 3, align = "left" }: StatisticsProps) {
  const centered = align === "center";

  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 ${COLUMNS_CLASS[columns]}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={centered ? "text-center" : "text-left"}
          style={{ borderTop: "1px solid var(--color-line)", paddingTop: "var(--space-6)" }}
        >
          {item.index && (
            <dt className="tokens-small" style={{ color: "var(--color-muted)" }}>
              {item.index}
            </dt>
          )}
          <dd
            className="font-heading"
            style={{
              color: "var(--color-text)",
              fontWeight: "var(--weight-display)",
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1,
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              marginTop: item.index ? "var(--space-3)" : 0,
            }}
          >
            <StatValue value={item.value} suffix={item.suffix} />
          </dd>
          <dt className="tokens-eyebrow" style={{ color: "var(--color-muted)", marginTop: "var(--space-3)" }}>
            {item.label}
          </dt>
          {item.description && (
            <dd className="tokens-small" style={{ color: "var(--color-muted)", marginTop: "var(--space-2)" }}>
              {item.description}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
