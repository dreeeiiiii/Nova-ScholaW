import { GraduationCap, BookOpenCheck, ShieldCheck, Check } from "lucide-react";

export default function HowToUse() {
  return (
    <section id="how-to-use" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 scroll-mt-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold tracking-widest text-text-muted">HOW IT WORKS</p>
        <h2 className="mt-2 font-heading text-2xl font-extrabold text-text-main sm:text-3xl">
          Built for students, teachers, and admins
        </h2>
        <p className="mt-3 text-sm text-text-muted">One hub, role-aware access, moderated content.</p>
      </div>

      <div className="mt-10 grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Students */}
        <div className="clay-card rounded-3xl bg-[#fdfaf3] p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9efff] text-[#315c86]">
            <GraduationCap size={20} aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-heading text-base font-bold text-text-main">Students</h3>
          <ul className="mt-3 space-y-2">
            {[
              "See general and class-targeted announcements",
              "Browse and search the event gallery",
              "Upload photos and videos for review",
              "Track your upload status and rejection reasons",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-sm text-text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-[#315c86]" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Teachers */}
        <div className="clay-card rounded-3xl bg-[#fdfaf3] p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff5e8] text-[#246044]">
            <BookOpenCheck size={20} aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-heading text-base font-bold text-text-main">Teachers</h3>
          <ul className="mt-3 space-y-2">
            {[
              "Everything students can do",
              "Create general or class-targeted announcements",
              "Attach images to announcements",
              "Target specific sections, courses, or students",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-sm text-text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-[#315c86]" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Admins */}
        <div className="clay-card rounded-3xl bg-[#fdfaf3] p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7defb] text-[#563d86]">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-heading text-base font-bold text-text-main">Admins</h3>
          <ul className="mt-3 space-y-2">
            {[
              "Review and approve pending uploads",
              "Manage users and their roles",
              "Organize gallery categories",
              "View a complete audit log",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-sm text-text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-[#315c86]" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
