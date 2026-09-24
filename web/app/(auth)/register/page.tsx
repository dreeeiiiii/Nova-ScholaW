"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "../_components/AuthShell";

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentLevel, setStudentLevel] = useState<"section" | "course">("section");
  const [availableOptions, setAvailableOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingOptions(true);
      try {
        const res = await fetch(`/api/auth/sections?level=${studentLevel}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setAvailableOptions(Array.isArray(data.sections) ? data.sections : []);
        }
      } catch {
        // leave dropdown to free-text fallback — options are optional
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [studentLevel]);

  function handleLevelChange(level: "section" | "course") {
    if (level === studentLevel) return;
    setStudentLevel(level);
    setIsAddingNew(false);
    setSelectedOption("");
  }

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
    const resolved = isAddingNew ? customValue : selectedOption;
    const normalizedSection = resolved.trim().replace(/\s+/g, " ").toLowerCase();
    const fieldName = studentLevel === "section" ? "Section" : "Course";
    if (!normalizedSection) {
      setError(`Please select or enter your ${fieldName}.`);
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
          section_id: null,
          course_id: null,
          studentLevel,
          student_level: studentLevel,
          sectionCourse: normalizedSection,
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
            <span className="label-token">
              Student Level
            </span>
            <div
              className="inline-flex p-1"
              role="group"
              aria-label="Student level"
              style={{
                borderRadius: "var(--radius-small)",
                backgroundColor: "var(--color-background-deep)",
                border: "1px solid var(--color-line)",
              }}
            >
              {(["section", "course"] as const).map((level) => {
                const active = studentLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLevelChange(level)}
                    aria-pressed={active}
                    className="px-4 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none"
                    style={{
                      borderRadius: "var(--radius-small)",
                      backgroundColor: active ? "var(--color-surface)" : "transparent",
                      color: active ? "var(--color-text)" : "var(--color-muted)",
                      boxShadow: active ? "var(--shadow-subtle)" : "none",
                      minHeight: "44px",
                    }}
                  >
                    {level === "section" ? "Section" : "Course"}
                  </button>
                );
              })}
            </div>

            <label htmlFor="sectionCourseSelect" className="label-token" style={{ marginTop: "var(--space-3)" }}>
              {studentLevel === "section" ? "Section" : "Course"}
            </label>
            <select
              id="sectionCourseSelect"
              value={isAddingNew ? "__add_new__" : selectedOption}
              onChange={(e) => {
                if (e.target.value === "__add_new__") {
                  setIsAddingNew(true);
                  setSelectedOption("");
                } else {
                  setSelectedOption(e.target.value);
                  setIsAddingNew(false);
                }
              }}
              className="input-token"
              required
              disabled={loadingOptions}
            >
              <option value="" disabled>
                Select your {studentLevel === "section" ? "section" : "course"}…
              </option>
              {availableOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="__add_new__">+ Add a new one</option>
            </select>

            {isAddingNew && (
              <>
                <input
                  id="sectionCourseCustom"
                  type="text"
                  autoComplete="off"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder={
                    studentLevel === "section"
                      ? "e.g. humss 11-b, grade 10 - mabini"
                      : "e.g. bsis 3-a, bsit 2-b"
                  }
                  className="input-token mt-2"
                  required
                />
                <p className="mt-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
                  This will be saved and shown to future students in your level.
                </p>
              </>
            )}

            <div
              style={{
                marginTop: "var(--space-3)",
                borderLeft: "2px solid var(--color-primary)",
                paddingLeft: "var(--space-3)",
              }}
            >
              <p
                className="tokens-small"
                style={{
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                Important
              </p>
              <p className="tokens-small" style={{ color: "var(--color-muted)", marginTop: "var(--space-1)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--color-text)" }}>This is how announcements find you.</strong>{" "}
                {studentLevel === "section"
                  ? "Senior High and below — enter your section exactly as your school uses it. We'll save it in lowercase (e.g. stem 12-a) so capitalization doesn't matter."
                  : "College — enter your course exactly as your school uses it. We'll save it in lowercase (e.g. bsis 3-a) so capitalization doesn't matter."}
              </p>
              <p className="tokens-small" style={{ color: "var(--color-muted)", opacity: 0.7, marginTop: "var(--space-1)" }}>
                Different spelling = different class. If you type it differently from your classmates, you won&apos;t receive their targeted announcements.
              </p>
            </div>

            {(isAddingNew ? customValue : selectedOption).trim() !== "" && (
              <p className="tokens-small" style={{ color: "var(--color-muted)", opacity: 0.6, marginTop: "var(--space-2)" }}>
                Saved as:{" "}
                <span className="font-mono">
                  {(isAddingNew ? customValue : selectedOption).trim().replace(/\s+/g, " ").toLowerCase()}
                </span>
              </p>
            )}
          </div>

          <div className="rise-in" style={{ animationDelay: "200ms" }}>
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
