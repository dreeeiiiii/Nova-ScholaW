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
    <main className="relative min-h-screen flex bg-[#F0EEFB]">
      {/* Dark Left Panel — brand anchor */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-16 bg-[#2E2A45] relative overflow-hidden">
        {/* Top: brand mark */}
        <Link
          href="/"
          className="inline-flex items-baseline gap-3 relative z-10"
          aria-label="Nova Schola Hub home"
        >
          <span className="font-heading text-xl font-extrabold text-white tracking-tight leading-none">
            Nova Schola
          </span>
          <span className="text-[10px] font-semibold text-white/50 tracking-[0.25em] uppercase">
            Hub
          </span>
        </Link>

        {/* Middle: editorial headline */}
        <div className="relative z-10 max-w-lg">
          <span className="text-eyebrow text-violet-300">WELCOME BACK</span>
          <h1 className="font-heading text-5xl xl:text-6xl font-extrabold text-white mt-6 leading-[0.95] tracking-tight text-balance">
            Log in to
            <br />
            your hub.
          </h1>
        </div>

        {/* Bottom: colophon */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-xs text-white/40 tracking-wide">
          </p>
        </div>
      </div>

      {/* Light Right Panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-10">
            <span className="text-eyebrow text-violet-600">WELCOME BACK</span>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-[#2E2A45] mt-4 leading-[1.05] tracking-tight">
              Log in to your hub.
            </h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-0" noValidate>
            <div className="mb-10">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#2E2A45] tracking-tight">
                Log in
              </h2>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 px-4 py-3 rounded-xl bg-[#8b3a2c]/8 border border-[#8b3a2c]/20 text-sm font-medium text-[#8b3a2c]"
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-[#5b5670] tracking-wider uppercase mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@my.nst.edu.ph"
                  className="w-full px-4 py-4 text-base text-[#2E2A45] placeholder-[#5b5670]/50 bg-white border border-[#2E2A45]/15 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all duration-200 min-h-[52px]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#5b5670] tracking-wider uppercase mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-4 text-base text-[#2E2A45] placeholder-[#5b5670]/50 bg-white border border-[#2E2A45]/15 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all duration-200 min-h-[52px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="btn-editorial btn-editorial-primary w-full mt-8 py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {pending ? "Logging in…" : "Log in"}
            </button>

            <div className="mt-8 pt-8 border-t border-[#2E2A45]/10 flex flex-col gap-4 text-sm text-[#5b5670]">
              <Link
                href="/"
                className="font-medium text-[#2E2A45] hover:text-violet-600 transition-colors min-h-[44px] inline-flex items-center"
              >
                ← Back to home
              </Link>
              <p>
                New student?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F0EEFB]">
          <div className="text-[#5b5670]">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}