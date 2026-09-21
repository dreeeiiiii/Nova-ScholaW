"use client";

import { useState } from "react";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function onLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      data-testid="logout"
      className={`press focus-ring flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-text-muted hover:text-primary ${className}`}
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
