import { NextResponse } from "next/server";
import { config } from "@/lib/config.server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") ?? "";

  const backendRes = await fetch(
    `${config.API_URL}/api/auth/sections?level=${encodeURIComponent(level)}`
  );

  const text = await backendRes.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!backendRes.ok) {
    const message = (data as { message?: string })?.message ?? (typeof data === "string" ? data : "Failed to load sections");
    return NextResponse.json({ message }, { status: backendRes.status });
  }

  const sections = (data as { sections?: unknown })?.sections;
  return NextResponse.json({ sections: Array.isArray(sections) ? sections : [] });
}
