import { proxyApi } from "@/lib/proxy-api";
export async function GET(req: Request) { return proxyApi("/api/sections" + new URL(req.url).search); }
export async function POST(req: Request) { return proxyApi("/api/sections", req); }
