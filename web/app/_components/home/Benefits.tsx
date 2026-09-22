const benefits = [
  {
    number: "01",
    title: "One hub",
    desc: "Announcements and event memories together — no more scattered group chats.",
  },
  {
    number: "02",
    title: "Role-aware",
    desc: "Students, teachers, and admins each see exactly what they need — nothing more.",
  },
  {
    number: "03",
    title: "Moderated content",
    desc: "Uploads are reviewed before they go public, keeping the gallery appropriate for a school.",
  },
  {
    number: "04",
    title: "Targeted announcements",
    desc: "Send to everyone, or just to specific classes and students.",
  },
  {
    number: "05",
    title: "Searchable gallery",
    desc: "Find memories by category, year, or media type in seconds.",
  },
  {
    number: "06",
    title: "Audit trail",
    desc: "Every write action is logged, from logins to approvals.",
  },
];

export default function Benefits() {
  return (
    <section
      id="benefits"
      className="section-space relative overflow-hidden bg-[#F0EEFB]"
    >
      <div className="container-editorial relative">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-6 lg:col-start-1 fade-up">
            <span className="text-eyebrow text-violet-600">
              WHY NOVA SCHOLA HUB
            </span>
            <h2 className="text-section font-heading text-[#2E2A45] mt-6 text-balance leading-[0.95] tracking-tight">
              Everything in
              <br />
              one place.
            </h2>
            <p className="text-body-lg text-[#5b5670] mt-6 max-w-lg">
              Designed for the way a school actually communicates. Centralized,
              moderated, and built around real workflows.
            </p>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 fade-up stagger-1">
            <div className="border-t border-[#2E2A45]/10">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.number}
                  className="group border-b border-[#2E2A45]/10 py-7 md:py-8 grid grid-cols-12 gap-4 md:gap-6 items-start transition-colors duration-300"
                >
                  <div className="col-span-2 md:col-span-2">
                    <span
                      className="font-heading text-2xl md:text-3xl font-extrabold text-[#2E2A45]/25 group-hover:text-violet-600 transition-colors duration-300"
                      aria-hidden="true"
                    >
                      {benefit.number}
                    </span>
                  </div>
                  <div className="col-span-10 md:col-span-10">
                    <h3 className="font-heading text-lg md:text-xl font-bold text-[#2E2A45] group-hover:text-violet-600 transition-colors duration-300 tracking-tight">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-[#5b5670]">
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-24 md:mt-32 fade-up stagger-2">
          <div className="relative bg-[#2E2A45] rounded-[40px] p-8 md:p-12 lg:p-16 xl:p-20 overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <span className="text-eyebrow text-violet-300">
                FOR DEVELOPERS
              </span>
              <h3 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 text-balance leading-[1.05] tracking-tight">
                Open source. Extensible.
                <br />
                Built on modern standards.
              </h3>
              <p className="text-body-lg text-white/60 mt-6 max-w-lg">
                Next.js 16, Express, PostgreSQL, TypeScript end-to-end. Clean
                architecture, ready to extend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}