import hero from "@/public/nst/misc/m50-shs-18-32a1dd37.webp";
import community from "@/public/nst/misc/m50-shs-12-41e59256.webp";
import learning from "@/public/nst/misc/shs-02-d9b6836d.webp";
import welcome from "@/public/nst/misc/img_2819-969097a2.webp";
import mark from "@/public/nst/branding/cropped-nova-schola-ntc-batangas-logos-2-a6775e70.webp";
import wordmark from "@/public/nst/branding/cropped-cropped-nova-schola-ntc-batangas-logos-7-scaled-727e34dd.webp";

// Curated from the local manifest; static imports validate paths at build time.
// These are UI assets only, never gallery records or upload sources.
export const nstImages = {
  hero: { src: hero, alt: "Nova Schola students gathered around the Griffin mascot outdoors" },
  community: { src: community, alt: "Nova Schola students seated together with the Griffin mascot in a covered court" },
  learning: { src: learning, alt: "Nova Schola students examining a computer motherboard together in a classroom" },
  welcome: { src: welcome, alt: "Nova Schola students reading an activity guide together outdoors" },
  mark: { src: mark, alt: "Nova Schola monogram" },
  wordmark: { src: wordmark, alt: "Nova Schola Tanauan City" },
} as const;
