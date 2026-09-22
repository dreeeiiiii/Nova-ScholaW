import { LayoutGrid, UsersRound, ShieldCheck, Megaphone, Search, History } from "lucide-react";

const items = [
  {
    icon: LayoutGrid,
    title: "One hub",
    desc: "Announcements and event memories together, no more scattered group chats.",
  },
  {
    icon: UsersRound,
    title: "Role-aware",
    desc: "Students, teachers, and admins each see exactly what they need — nothing more.",
  },
  {
    icon: ShieldCheck,
    title: "Moderated content",
    desc: "Uploads are reviewed before they go public, keeping the gallery appropriate for a school.",
  },
  {
    icon: Megaphone,
    title: "Targeted announcements",
    desc: "Send to everyone, or just to specific classes and students.",
  },
  {
    icon: Search,
    title: "Searchable gallery",
    desc: "Find memories by category, year, or media type in seconds.",
  },
  {
    icon: History,
    title: "Audit trail",
    desc: "Every write action is logged, from logins to approvals.",
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 scroll-mt-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold tracking-widest text-text-muted">WHY USE NOVA SCHOLA HUB</p>
        <h2 className="mt-2 font-heading text-2xl font-extrabold text-text-main sm:text-3xl">
          Everything in one place
        </h2>
        <p className="mt-3 text-sm text-text-muted">Designed for the way a school actually communicates.</p>
      </div>

      <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="clay-card rounded-2xl bg-[#fdfaf3] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-base text-text-main">
              <Icon size={20} aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-heading text-sm font-bold text-text-main">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
