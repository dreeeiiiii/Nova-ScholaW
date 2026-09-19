import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config.server";
import { getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const res = await fetch(`${config.API_URL}/api/announcements/general`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? "Failed to create announcement";
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
