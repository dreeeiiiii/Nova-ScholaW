const techStack = [
  { category: "Frontend", items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4"] },
  { category: "Backend", items: ["Express 4", "Node.js", "PostgreSQL", "Prisma ORM"] },
  { category: "Auth & Security", items: ["JWT + HttpOnly Cookies", "Role-based Access", "Rate Limiting", "Audit Logging"] },
  { category: "Infrastructure", items: ["Vercel", "Docker", "GitHub Actions", "PostgreSQL (Managed)"] },
];

export default function AboutProject() {
  return (
    <section id="about" className="section-space-sm relative overflow-hidden bg-base">
      <div className="container-editorial">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 lg:col-start-1 fade-up">
            <span className="text-eyebrow text-primary">ABOUT THIS PROJECT</span>
            <h2 className="text-section font-heading text-text-main mt-4 text-balance leading-[1.02]">
              A capstone project for<br />Nova Schola Tanauan
            </h2>
            <p className="text-body-lg text-text-muted mt-6 max-w-xl">
              Nova Schola Hub centralizes school announcements and event memories into a single moderated platform. It was
              built as a capstone project for the Bachelor of Science in Information Systems program, demonstrating a
              full-stack application with role-based access control, content moderation, and a modern web stack.
            </p>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 fade-up stagger-2">
            <div className="relative aspect-square organic-shape bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/15 rounded-[40px] flex items-center justify-center">
              <div className="relative z-10 text-center p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 text-primary mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="font-heading text-3xl md:text-4xl font-extrabold text-text-main">Capstone</p>
                <p className="text-body-lg text-text-muted mt-2">Class of 2026</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 md:w-40 md:h-40 organic-shape-3 border-2 border-primary/20" aria-hidden="true" />
              <div className="absolute -top-4 -left-4 w-24 h-24 md:w-28 md:h-28 organic-shape border-2 border-secondary/30" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="mt-20 md:mt-28 fade-up stagger-3">
          <div className="grid lg:grid-cols-4 gap-8 lg:gap-12">
            {techStack.map((category, catIndex) => (
              <div key={category.category} className={`stagger-${(catIndex % 6) + 1}`}>
                <p className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-4">
                  {category.category}
                </p>
                <ul className="space-y-3" role="list">
                  {category.items.map((item, itemIndex) => (
                    <li
                      key={item}
                      className={`relative pl-6 text-base leading-relaxed text-text-muted transition-colors duration-200 hover:text-text-main group/card ${itemIndex < category.items.length - 1 ? "pb-3 border-b border-primary/10" : ""}`}
                    >
                      <span className="absolute left-0 top-0.5 w-1.5 h-1.5 rounded-full bg-primary/30 group-hover/card:bg-primary transition-colors" aria-hidden="true" />
                      <span className="font-medium text-text-main">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}