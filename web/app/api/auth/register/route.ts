import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config.server";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const backendRes = await fetch(`${config.API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await backendRes.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!backendRes.ok) {
    const message = (data as { message?: string })?.message ?? (typeof data === "string" ? data : "Registration failed");
    return NextResponse.json({ message }, { status: backendRes.status });
  }

  const message = (data as { message?: string })?.message ?? "Account created. You can now log in.";
  return NextResponse.json({ message }, { status: 201 });
}
