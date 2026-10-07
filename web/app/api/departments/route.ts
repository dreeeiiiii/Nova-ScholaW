import { proxyApi } from "@/lib/proxy-api";
export async function GET() { return proxyApi("/api/departments"); }
