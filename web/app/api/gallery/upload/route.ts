import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const formData = await req.formData();

  const res = await fetch(`${config.API_URL}/api/gallery/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? "Upload failed";
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
