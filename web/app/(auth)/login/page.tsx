"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function isSafeFrom(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from");
  const from = isSafeFrom(rawFrom) ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        router.push(from);
        router.refresh();
        return;
      }

      // Map backend errors
      if (res.status === 401) {
        setError(data.message || "Invalid email or password.");
      } else if (res.status === 403) {
        setError(data.message || "Account is deactivated.");
      } else if (res.status === 429) {
        setError("Too many attempts. Try again later.");
      } else if (res.status === 400) {
        setError(data.message || "Please check your input.");
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-clay-sm bg-[#d9efff] font-heading text-lg font-extrabold text-[#315c86] shadow-clay">
            NSH
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-text-main">Nova Schola Hub</h1>
          <p className="mt-1 text-sm text-text-muted">Official school connection</p>
        </div>

        <form onSubmit={onSubmit} className="clay-card rounded-clay p-6 sm:p-8" noValidate>
          <h2 className="font-heading text-lg font-bold text-text-main">Log in</h2>
          <p className="mt-1 text-xs text-text-muted">Official NST email-only access</p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-clay-sm bg-danger/20 px-4 py-3 text-sm font-medium text-[#8b3a2c]"
            >
              {error}
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="email" className="block text-sm font-semibold text-text-main">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@my.nst.edu.ph"
              className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted"
              required
            />
          </div>

          <div className="mt-4">
            <label htmlFor="password" className="block text-sm font-semibold text-text-main">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted"
              required
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="clay-btn mt-6 w-full rounded-clay-pill bg-[#315c86] px-4 py-2.5 text-sm font-bold text-white shadow-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-[#315c86] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>

          <div className="mt-4 text-center text-sm">
            <Link href="/" className="font-semibold text-[#315c86] hover:text-[#23446c]">
              ← Back to home
            </Link>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-text-muted">Official NST email-only access</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-base"><div className="clay-card p-8">Loading…</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
