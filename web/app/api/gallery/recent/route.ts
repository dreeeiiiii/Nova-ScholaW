import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config.server";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const search = new URL(req.url).search;

  const res = await fetch(`${config.API_URL}/api/gallery/recent${search}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? "Failed to fetch recent media";
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
