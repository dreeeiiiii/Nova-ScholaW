"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "../_components/AuthShell";

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
      <AuthShell
        eyebrow="Account created"
        statement="You're ready to join."
        support="Your account has been created. Log in to access your hub."
        indexLabel="02"
        mobileTitle="Account created"
      >
        <div className="rise-in" style={{ animationDelay: "0ms" }}>
          <div
            role="status"
            className="tokens-small"
            style={{
              borderRadius: "var(--radius-small)",
              backgroundColor: "var(--color-success-bg)",
              border: "1px solid color-mix(in srgb, var(--color-success) 35%, transparent)",
              color: "var(--color-success)",
              padding: "var(--space-3) var(--space-4)",
              fontWeight: 600,
            }}
          >
            {success}
          </div>
        </div>

        <div className="rise-in" style={{ marginTop: "var(--space-6)", animationDelay: "40ms" }}>
          <Link href="/login" className="tokens-btn tokens-btn-primary group w-full text-sm">
            Go to log in
            <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
              &rarr;
            </span>
          </Link>
        </div>

        <p className="rise-in mt-4 text-center text-sm" style={{ color: "var(--color-muted)", animationDelay: "80ms" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--color-primary)" }}>
            Log in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Get started"
      statement="Join Nova Schola Hub."
      support="Set up your school's communication hub in minutes. Free for educational institutions."
      indexLabel="02"
      mobileTitle="Get started"
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="rise-in" style={{ animationDelay: "0ms" }}>
          <h1 className="tokens-heading-2 text-balance" style={{ color: "var(--color-text)" }}>
            Create your account
          </h1>
          <p className="tokens-body" style={{ color: "var(--color-muted)", marginTop: "var(--space-2)" }}>
            Student self-signup
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
            <label htmlFor="full-name" className="label-token">
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Santos"
              className="input-token"
              required
            />
          </div>

          <div className="rise-in" style={{ animationDelay: "120ms" }}>
            <label htmlFor="reg-email" className="label-token">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@my.nst.edu.ph"
              className="input-token"
              required
            />
            <p className="tokens-small" style={{ color: "var(--color-muted)", marginTop: "var(--space-2)" }}>
              Must be an @my.nst.edu.ph email
            </p>
          </div>

          <div className="rise-in" style={{ animationDelay: "160ms" }}>
            <label htmlFor="reg-password" className="label-token">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-token"
              required
            />
          </div>

          <div className="rise-in" style={{ animationDelay: "200ms" }}>
            <label htmlFor="reg-confirm" className="label-token">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-token"
              required
            />
          </div>

          <div className="rise-in" style={{ animationDelay: "240ms" }}>
            <label htmlFor="reg-section" className="label-token">
              Section
            </label>
            <select
              id="reg-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="input-token"
            >
              <option value="">No section</option>
              {sections.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rise-in" style={{ animationDelay: "280ms" }}>
            <label htmlFor="reg-course" className="label-token">
              Course
            </label>
            <select
              id="reg-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="input-token"
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

        <div className="rise-in" style={{ marginTop: "var(--space-8)", animationDelay: "320ms" }}>
          <button
            type="submit"
            disabled={pending}
            className="tokens-btn tokens-btn-primary group w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Creating account…" : (
              <>
                Create account
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
            animationDelay: "360ms",
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
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors duration-200 motion-reduce:transition-none"
              style={{ color: "var(--color-primary)" }}
            >
              Log in
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <RegisterForm />;
}
