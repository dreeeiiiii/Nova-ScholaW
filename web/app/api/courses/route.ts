import { proxyApi } from "@/lib/proxy-api";
export async function GET(req: Request) { return proxyApi("/api/courses" + new URL(req.url).search); }
export async function POST(req: Request) { return proxyApi("/api/courses", req); }
