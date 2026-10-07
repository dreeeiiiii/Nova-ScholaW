import { config } from "./config.client";

export function resolveMediaUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  // Official NST static assets are served by Next.js, not the API.
  if (fileUrl.startsWith("/nst/")) return fileUrl;
  // fileUrl is like /uploads/gallery/images/xxx.jpg
  return `${config.NEXT_PUBLIC_API_URL}${fileUrl}`;
}
