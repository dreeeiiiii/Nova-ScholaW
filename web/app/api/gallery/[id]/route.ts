import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config.server";
import { getTokenFromCookie } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const res = await fetch(`${config.API_URL}/api/gallery/${encodeURIComponent(id)}`, {
    method: "DELETE",
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
    const msg = (data as { message?: string })?.message ?? "Failed to delete media";
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
