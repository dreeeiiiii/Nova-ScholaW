import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config.server";
import { setTokenCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown })?.email === "string" ? (body as { email: string }).email.trim() : "";
  const password = typeof (body as { password?: unknown })?.password === "string" ? (body as { password: string }).password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const backendRes = await fetch(`${config.API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await backendRes.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!backendRes.ok) {
    const message = (data as { message?: string })?.message ?? (typeof data === "string" ? data : "Login failed");
    return NextResponse.json({ message }, { status: backendRes.status });
  }

  const token = (data as { token?: string })?.token;
  const user = (data as { user?: unknown })?.user;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ message: "Invalid backend response" }, { status: 502 });
  }

  await setTokenCookie(token);

  // Never return the token to the client
  return NextResponse.json({ user });
}
