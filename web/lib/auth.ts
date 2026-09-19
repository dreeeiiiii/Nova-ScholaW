import { cookies } from "next/headers";
import { cache } from "react";
import { config } from "./config";

export const COOKIE_NAME = "ns_token";
// Must stay in sync with server JWT expiry (server/.env JWT_EXPIRES_IN=8h)
export const COOKIE_MAX_AGE = 8 * 60 * 60; // 28800 seconds

export type CurrentUser = {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student";
  section_id: number | null;
  course_id: number | null;
  is_active: boolean;
  section_name?: string | null;
  course_name?: string | null;
};

/**
 * Server-only: read ns_token from cookies (Next 15+ cookies() is async).
 */
export async function getTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Set httpOnly cookie — call only inside a Route Handler (login).
 * Attributes: httpOnly true, SameSite Lax, Secure in prod, Path /, maxAge 28800.
 */
export async function setTokenCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearTokenCookie(): Promise<void> {
  const store = await cookies();
  // Overwrite with expired cookie
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Server-only helper that calls backend GET /api/auth/me with Bearer token.
 * Cached per request via React.cache() — avoids duplicate fetches in same render.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getTokenFromCookie();
  if (!token) return null;

  try {
    const res = await fetch(`${config.API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.user as CurrentUser) ?? null;
  } catch {
    return null;
  }
});

export function requireRole(
  user: CurrentUser | null,
  roles: CurrentUser["role"][],
): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
