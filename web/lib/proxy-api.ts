import { config } from "./config.server";
import { getTokenFromCookie } from "./auth";

export async function proxyApi(path:string,req?:Request,authenticated=true){
  const token=authenticated?await getTokenFromCookie():null;
  if(authenticated&&!token)return Response.json({message:"Not authenticated"},{status:401});
  const method=req?.method??"GET";
  try{
    const res=await fetch(config.API_URL+path,{method,headers:{...(token?{Authorization:"Bearer "+token}:{}),...(!["GET","HEAD"].includes(method)?{"Content-Type":"application/json"}:{})},body:req&&!["GET","HEAD"].includes(method)?await req.text():undefined,cache:"no-store"});
    return new Response(await res.text(),{status:res.status,headers:{"Content-Type":"application/json"}});
  }catch{return Response.json({message:"API unavailable. Try again."},{status:502});}
}
