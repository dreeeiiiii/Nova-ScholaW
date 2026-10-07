import { proxyApi } from "@/lib/proxy-api";
type Context = { params: Promise<{id: string}> };
export async function PUT(req: Request, {params}: Context) { const {id} = await params; return proxyApi("/api/sections/" + encodeURIComponent(id), req); }
export async function DELETE(req: Request, {params}: Context) { const {id} = await params; return proxyApi("/api/sections/" + encodeURIComponent(id), req); }
