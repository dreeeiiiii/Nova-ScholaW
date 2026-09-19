import { config } from "./config.server";
import { getTokenFromCookie } from "./auth";

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Server-only fetch: reads httpOnly cookie, forwards as Bearer.
 * Throws ApiError on non-2xx.
 */
export async function serverFetch(path: string, options: FetchOptions = {}) {
  const token = await getTokenFromCookie();
  const url = `${config.API_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
    cache: options.cache ?? "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ??
      (typeof data === "string" ? data : `Request failed with ${res.status}`);
    throw new ApiError(res.status, msg, data);
  }

  return data;
}

/**
 * Browser-side fetch — httpOnly cookie cannot be read here.
 * For client components, call Next route handlers at /api/* instead.
 */
export async function clientFetch(): Promise<never> {
  throw new Error("use route handlers for client-side auth calls — clientFetch cannot read httpOnly cookie");
}
