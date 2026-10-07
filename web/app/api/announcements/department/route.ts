import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/proxy-api";
export async function POST(req: NextRequest) {
  return proxyApi("/api/announcements/department", req);
}
