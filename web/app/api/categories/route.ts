import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const res = await fetch(`${config.API_URL}/api/categories`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
    const msg = (data as { message?: string })?.message ?? "Failed to create category";
    return NextResponse.json({ message: msg, ...(typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}) }, { status: res.status });
  }

  return NextResponse.json(data, { status: res.status });
}
