import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-base p-6 text-center">
      <div className="clay-card max-w-lg p-8">
        <h1 className="font-heading text-3xl font-extrabold text-text-main">Nova Schola Hub</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Stay informed. Stay connected. Official school announcements and event memories in one moderated space.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="clay-btn rounded-clay-pill bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-clay">
            Log in
          </Link>
          <Link href="/gallery" className="clay-btn rounded-clay-pill bg-surface px-6 py-2.5 text-sm font-bold text-text-main shadow-clay">
            Browse gallery
          </Link>
        </div>
      </div>
    </main>
  );
}
