import { proxyApi } from "@/lib/proxy-api";
export function GET(req:Request){return proxyApi("/api/auth/sections"+new URL(req.url).search,undefined,false);}
