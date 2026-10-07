import { proxyApi } from "@/lib/proxy-api";
export function GET(){return proxyApi("/api/auth/departments",undefined,false);}
