"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Option = { id: number | string; name: string };

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sections, setSections] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [secRes, couRes] = await Promise.all([fetch("/api/sections"), fetch("/api/courses")]);
        if (cancelled) return;
        if (secRes.ok) {
          const data = await secRes.json();
          setSections(data.sections ?? []);
        }
        if (couRes.ok) {
          const data = await couRes.json();
          setCourses(data.courses ?? []);
        }
      } catch {
        // leave dropdowns empty — section/course are optional
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Full name, email, and password are required.");
      return;
    }
    if (fullName.trim().length > 100) {
      setError("Full name must be 100 characters or fewer.");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@my.nst.edu.ph")) {
      setError("Only @my.nst.edu.ph emails can register");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          section_id: sectionId ? Number(sectionId) : null,
          course_id: courseId ? Number(courseId) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(data.message || "Account created. You can now log in.");
        return;
      }

      if (res.status === 409) {
        setError(data.message || "Email already registered");
      } else if (res.status === 429) {
        setError("Too many attempts. Try again later.");
      } else if (res.status === 400) {
        setError(data.message || "Please check your input.");
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <main className="relative min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-10 md:p-16 lg:p-24 bg-[#1a0b2e] relative overflow-hidden">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px] opacity-50" />
          </div>
          <div className="relative z-10 max-w-lg mx-auto w-full text-center md:text-left">
            <span className="text-eyebrow text-primary">ACCOUNT CREATED</span>
            <h1 className="text-section font-heading text-white mt-4 text-balance leading-[1.02]">
              You&apos;re ready to join
            </h1>
            <p className="text-body-lg text-white/60 mt-6 max-w-md">
              Your account has been created. Log in to access your hub.
            </p>
          </div>
        </div>
        <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 lg:p-16 bg-base">
          <div className="w-full max-w-md text-center">
            <div className="mb-8 md:mb-12 lg:hidden text-center">
              <span className="text-eyebrow text-primary">ACCOUNT CREATED</span>
              <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-text-main mt-3 text-balance">
                You&apos;re ready to join
              </h1>
              <p className="text-body-lg text-text-muted mt-4 max-w-md mx-auto">
                Your account has been created. Log in to access your hub.
              </p>
            </div>
            <div className="lg:hidden h-px bg-primary/20 my-8" aria-hidden="true"></div>

            <div className="p-4 rounded-xl bg-[#dff5e8] border border-[#86efac] mb-6">
              <p className="text-sm font-medium text-[#246044]">{success}</p>
            </div>

            <Link
              href="/login"
              className="btn-editorial btn-editorial-primary w-full py-4 text-base"
            >
              Go to log in
            </Link>

            <p className="mt-4 text-center text-sm text-text-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex">
      {/* Dark Left Panel - Brand Anchor */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-10 md:p-16 lg:p-24 bg-[#1a0b2e] relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px] opacity-50" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto w-full text-center md:text-left">
          <span className="text-eyebrow text-primary">GET STARTED</span>
          <h1 className="text-section font-heading text-white mt-4 text-balance leading-[1.02]">
            Join Nova Schola Hub
          </h1>
          <p className="text-body-lg text-white/60 mt-6 max-w-md">
            Set up your school&apos;s communication hub in minutes. Free for educational institutions.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Moderated content
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              Searchable archive
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Role-based access
            </span>
          </div>
        </div>
      </div>

      {/* Light Right Panel - Form Area */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 lg:p-16 bg-base">
        <div className="w-full max-w-md">
          <div className="mb-8 md:mb-12 lg:hidden text-center">
            <span className="text-eyebrow text-primary">GET STARTED</span>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-text-main mt-3 text-balance">
              Join Nova Schola Hub
            </h1>
            <p className="text-body-lg text-text-muted mt-4 max-w-md mx-auto">
              Set up your school&apos;s communication hub in minutes. Free for educational institutions.
            </p>
          </div>

          <div className="lg:hidden h-px bg-primary/20 my-8" aria-hidden="true"></div>

          <form onSubmit={onSubmit} className="space-y-0" noValidate>
            <div className="mb-8">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-main">Create account</h2>
              <p className="mt-2 text-base text-text-muted">Student self-signup</p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm font-medium text-[#8b3a2c]"
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="full-name" className="block text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                  Full name
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Santos"
                  className="w-full px-4 py-4 text-base text-text-main placeholder-text-muted bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors min-h-[52px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@my.nst.edu.ph"
                  className="w-full px-4 py-4 text-base text-text-main placeholder-text-muted bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors min-h-[52px]"
                  required
                />
                <p className="mt-1.5 text-xs text-text-muted">Must be an @my.nst.edu.ph email</p>
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-4 text-base text-text-main placeholder-text-muted bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors min-h-[52px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                  Confirm password
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-4 text-base text-text-main placeholder-text-muted bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors min-h-[52px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-section" className="block text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                  Section
                </label>
                <select
                  id="reg-section"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-4 py-4 text-base text-text-main bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors min-h-[52px] appearance-none bg-no-repeat bg-right pr-10"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236B6880' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 1rem center" }}
                >
                  <option value="">No section</option>
                  {sections.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reg-course" className="block text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                  Course
                </label>
                <select
                  id="reg-course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-4 py-4 text-base text-text-main bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors min-h-[52px] appearance-none bg-no-repeat bg-right pr-10"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236B6880' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 1rem center" }}
                >
                  <option value="">No course</option>
                  {courses.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="btn-editorial btn-editorial-primary w-full mt-8 py-4 text-base"
            >
              {pending ? "Creating account…" : "Create account"}
            </button>

            <div className="mt-6 text-center text-sm text-text-muted">
              <Link href="/" className="font-semibold text-text-main hover:text-primary transition-colors min-h-[44px] inline-flex items-center justify-center px-2">
                ← Back to home
              </Link>
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return <RegisterForm />;
}