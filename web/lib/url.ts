import { config } from "./config.client";

export function resolveMediaUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  // fileUrl is like /uploads/gallery/images/xxx.jpg
  return `${config.NEXT_PUBLIC_API_URL}${fileUrl}`;
}
