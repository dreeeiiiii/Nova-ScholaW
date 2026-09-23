"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "../_components/AuthShell";

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
    <AuthShell
      eyebrow="Welcome back"
      statement="Log in to your hub."
      support="Sign in to continue to your dashboard."
      indexLabel="01"
      mobileTitle="Welcome back"
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="rise-in" style={{ animationDelay: "0ms" }}>
          <h1 className="tokens-heading-2 text-balance" style={{ color: "var(--color-text)" }}>
            Welcome back
          </h1>
          <p className="tokens-body" style={{ color: "var(--color-muted)", marginTop: "var(--space-2)" }}>
            Sign in to continue to your dashboard.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rise-in tokens-small"
            style={{
              borderRadius: "var(--radius-small)",
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
              color: "var(--color-danger)",
              padding: "var(--space-3) var(--space-4)",
              fontWeight: 600,
              marginTop: "var(--space-6)",
              animationDelay: "40ms",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="rise-in" style={{ animationDelay: "80ms" }}>
            <label htmlFor="email" className="label-token">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@my.nst.edu.ph"
              className="input-token"
              required
            />
          </div>

          <div className="rise-in" style={{ animationDelay: "120ms" }}>
            <label htmlFor="password" className="label-token">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-token"
              required
            />
          </div>
        </div>

        <div className="rise-in" style={{ marginTop: "var(--space-8)", animationDelay: "160ms" }}>
          <button
            type="submit"
            disabled={pending}
            className="tokens-btn tokens-btn-primary group w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Logging in…" : (
              <>
                Sign in
                <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
                  &rarr;
                </span>
              </>
            )}
          </button>
        </div>

        <div
          className="rise-in"
          style={{
            marginTop: "var(--space-8)",
            borderTop: "1px solid var(--color-line)",
            paddingTop: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            animationDelay: "200ms",
          }}
        >
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-sm font-medium transition-colors duration-200 motion-reduce:transition-none"
            style={{ color: "var(--color-muted)" }}
          >
            &larr; Back to home
          </Link>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            New student?{" "}
            <Link
              href="/register"
              className="font-semibold transition-colors duration-200 motion-reduce:transition-none"
              style={{ color: "var(--color-primary)" }}
            >
              Register &rarr;
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ backgroundColor: "var(--color-background)", color: "var(--color-muted)" }}
        >
          <div className="tokens-body">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
