import { proxyApi } from "@/lib/proxy-api";
export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyApi("/api/announcements/tv" + search, undefined, false);
}
