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
      className={`tokens-btn tokens-btn-secondary !min-h-[44px] !px-5 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
