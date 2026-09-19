// Source of truth for clay design tokens (Tailwind 4 CSS-first would use @theme inline,
// but we keep config as single source to avoid duplication — globals.css @theme block removed 2026-09-19).
// If a conflict arises, this file wins because globals.css no longer defines --color-* / --radius-*.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#F0EEFB",
        surface: "#FBFAFF",
        primary: "#A78BFA",
        secondary: "#7DD3FC",
        success: "#86EFAC",
        warning: "#FDE68A",
        danger: "#FCA5A5",
        "text-main": "#2E2A45",
        "text-muted": "#6B6880",
      },
      fontFamily: {
        heading: ["var(--font-raleway)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderRadius: {
        clay: "28px",
        "clay-sm": "16px",
        "clay-pill": "9999px",
      },
      boxShadow: {
        clay: "6px 6px 14px rgba(167, 139, 250, 0.20), -4px -4px 10px rgba(255, 255, 255, 0.80) inset",
        "clay-hover": "8px 8px 18px rgba(167, 139, 250, 0.28), -5px -5px 14px rgba(255, 255, 255, 0.85) inset",
        "clay-inset": "inset 4px 4px 8px rgba(167, 139, 250, 0.15), inset -3px -3px 6px rgba(255, 255, 255, 0.70)",
        "clay-sm": "3px 3px 7px rgba(167, 139, 250, 0.14), -2px -2px 5px rgba(255, 255, 255, 0.70) inset",
      },
      keyframes: {
        "clay-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "clay-pulse": "clay-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
