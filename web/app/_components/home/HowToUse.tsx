import { GraduationCap, BookOpenCheck, ShieldCheck } from "lucide-react";

const roles = [
  {
    id: "students",
    icon: GraduationCap,
    title: "Students",
    items: [
      "See general and class-targeted announcements",
      "Browse and search the event gallery",
      "Upload photos and videos for review",
      "Track your upload status and rejection reasons",
    ],
  },
  {
    id: "teachers",
    icon: BookOpenCheck,
    title: "Teachers",
    items: [
      "Everything students can do",
      "Create general or class-targeted announcements",
      "Attach images to announcements",
      "Target specific sections, courses, or students",
    ],
  },
  {
    id: "admins",
    icon: ShieldCheck,
    title: "Admins",
    items: [
      "Review and approve pending uploads",
      "Manage users and their roles",
      "Organize gallery categories",
      "View a complete audit log",
    ],
  },
];

export default function HowToUse() {
  return (
    <section
      id="how-to-use"
      className="section-space relative overflow-hidden bg-[#2E2A45]"
    >
      <div className="container-editorial relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 mb-16 md:mb-24">
          <div className="lg:col-span-7">
            <span className="text-eyebrow text-violet-300">
              HOW IT WORKS
            </span>
            <h2 className="text-section font-heading text-white mt-6 leading-[0.95] tracking-tight text-balance">
              Built for students,
              <br />
              teachers, and admins.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-8 flex items-end">
            <p className="text-body-lg text-white/60 max-w-md">
              One hub with role-aware access. Everyone sees exactly what they
              need — nothing more, nothing less.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className="group border-b border-white/10 py-10 md:py-14 grid grid-cols-12 gap-6 md:gap-10 items-start"
              >
                <div className="col-span-12 md:col-span-2">
                  <span
                    className="font-heading text-5xl md:text-7xl lg:text-8xl font-extrabold leading-none tracking-tighter text-white/15 group-hover:text-violet-300/50 transition-colors duration-500"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </div>

                <div className="col-span-12 md:col-span-3">
                  <div className="flex items-center gap-3">
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      className="text-violet-300 shrink-0"
                      aria-hidden="true"
                    />
                    <h3 className="font-heading text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {role.title}
                    </h3>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-7">
                  <ul className="space-y-3.5">
                    {role.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-4 text-base leading-relaxed text-white/75"
                      >
                        <span
                          className="mt-[0.7em] h-px w-4 bg-violet-300/60 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}