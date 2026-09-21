import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config.server";
import { getTokenFromCookie } from "@/lib/auth";

const ALLOWED = new Set(["deactivate", "activate"]);

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { id, action } = await params;

  if (!ALLOWED.has(action)) {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const res = await fetch(`${config.API_URL}/api/users/${encodeURIComponent(id)}/${encodeURIComponent(action)}`, {
    method: "PATCH",
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
    const msg = (data as { message?: string })?.message ?? `Failed to ${action} user`;
    return NextResponse.json({ message: msg }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
