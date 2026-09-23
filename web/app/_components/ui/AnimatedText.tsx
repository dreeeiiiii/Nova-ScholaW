"use client";

import { createElement, useEffect, useState } from "react";

type AnimatedTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  splitBy?: "word" | "line";
  stagger?: number;
  duration?: number;
  delay?: number;
  className?: string;
};

/**
 * Word/line staggered text reveal on scroll.
 * Parent keeps the full text via aria-label; animated word spans
 * are aria-hidden. Under reduced motion it renders as plain text.
 */
export function AnimatedText({
  text,
  as = "p",
  splitBy = "word",
  stagger = 40,
  duration = 500,
  delay = 0,
  className,
}: AnimatedTextProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (!node || reduced) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, reduced]);

  // Plain text path (reduced motion): no split, no observer needed.
  if (reduced) {
    return createElement(as, { className }, text);
  }

  const parts = splitBy === "line" ? text.split("\n") : text.split(/\s+/).filter(Boolean);
  const ms = Math.min(600, Math.max(200, duration));

  return createElement(
    as,
    { ref: setNode, className, "aria-label": text },
    parts.map((part, i) => (
      <span
        key={`${i}-${part}`}
        aria-hidden="true"
        style={{
          display: "inline-block",
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(0.5em)",
          transitionProperty: "opacity, transform",
          transitionDuration: `${ms}ms`,
          transitionTimingFunction: "ease-out",
          transitionDelay: `${Math.max(0, delay) + i * Math.max(0, stagger)}ms`,
          willChange: visible ? undefined : "opacity, transform",
        }}
      >
        {part}
        {splitBy === "word" && i < parts.length - 1 ? "\u00A0" : null}
        {splitBy === "line" && i < parts.length - 1 ? createElement("br") : null}
      </span>
    ))
  );
}
