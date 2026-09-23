"use client";

import { createElement, useEffect, useState } from "react";

type RevealDirection = "up" | "down" | "left" | "right";

type RevealOnScrollProps = {
  as?: keyof React.JSX.IntrinsicElements;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  className?: string;
  children: React.ReactNode;
};

const OFFSET: Record<RevealDirection, string> = {
  up: "translateY(24px)",
  down: "translateY(-24px)",
  left: "translateX(24px)",
  right: "translateX(-24px)",
};

function clampDuration(ms: number) {
  return Math.min(600, Math.max(200, ms));
}

/**
 * Base scroll-reveal primitive: fades + slides children in via
 * IntersectionObserver + CSS transitions (no animation libs).
 * Transform-only (translate) so no layout shift is introduced.
 * Honors `once` and `prefers-reduced-motion` (renders immediately).
 */
export function RevealOnScroll({
  as = "div",
  direction = "up",
  delay = 0,
  duration = 500,
  once = true,
  amount = 0.2,
  className,
  children,
}: RevealOnScrollProps) {
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
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: Math.min(1, Math.max(0, amount)) }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, once, amount, reduced]);

  const ms = clampDuration(duration);
  const shown = visible || reduced;

  return createElement(
    as,
    {
      ref: setNode,
      className,
      style: {
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : OFFSET[direction],
        transitionProperty: "opacity, transform",
        transitionDuration: reduced ? "0ms" : `${ms}ms`,
        transitionTimingFunction: "ease-out",
        transitionDelay: reduced ? "0ms" : `${Math.max(0, delay)}ms`,
        willChange: shown ? undefined : "opacity, transform",
      },
    },
    children
  );
}
