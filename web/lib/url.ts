import { config } from "./config";

export function resolveMediaUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  // fileUrl is like /uploads/gallery/images/xxx.jpg
  const base =
    typeof window !== "undefined" ? config.NEXT_PUBLIC_API_URL : config.API_URL;
  return `${base}${fileUrl}`;
}
