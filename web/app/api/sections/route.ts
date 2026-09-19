import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET() {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const res = await fetch(`${config.API_URL}/api/sections`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.text();
  let json: unknown = null;
  try {
    json = data ? JSON.parse(data) : null;
  } catch {
    json = data;
  }
  if (!res.ok) {
    const msg = (json as { message?: string })?.message ?? "Failed to fetch sections";
    return NextResponse.json({ message: msg }, { status: res.status });
  }
  return NextResponse.json(json);
}
