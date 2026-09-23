// Design tokens: raw values live in app/tokens.css (:root vars).
// This config only bridges the NEW token names into Tailwind utilities.
// Legacy pre-token palette removed in Step 10 (grep-proven unused).
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Step 2 token bridge (kept — used as bg-brand, bg-canvas, etc.).
        brand: "var(--color-primary)",
        canvas: "var(--color-background)",
        ink: "var(--color-text)",
        surface: "var(--color-surface)",
        dark: "var(--color-dark)",
        accent: "var(--color-accent)",
        muted: "var(--color-muted)",
      },
      fontFamily: {
        heading: ["var(--font-raleway)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
