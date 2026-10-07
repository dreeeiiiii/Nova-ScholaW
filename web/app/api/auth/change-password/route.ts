import { proxyApi } from "@/lib/proxy-api";
import { clearTokenCookie } from "@/lib/auth";
export async function POST(req:Request){
  const res=await proxyApi("/api/auth/change-password",req);
  if(res.ok)await clearTokenCookie();
  return res;
}
