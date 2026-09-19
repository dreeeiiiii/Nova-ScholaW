import { NextResponse } from "next/server";
import { config } from "@/lib/config.server";
import { getTokenFromCookie } from "@/lib/auth";

export async function GET() {
  const token = await getTokenFromCookie();
  // Categories are public on backend, but we forward with token if present for consistency
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${config.API_URL}/api/categories`, {
    headers,
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
    const msg = (data as { message?: string })?.message ?? "Failed to fetch categories";
    return NextResponse.json({ message: msg }, { status: res.status });
  }
  return NextResponse.json(data);
}
