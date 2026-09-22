export default function AboutProject() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 scroll-mt-20">
      <div className="mx-auto max-w-3xl clay-card rounded-3xl bg-[#fdfaf3] p-8 text-center">
        <p className="text-xs font-bold tracking-widest text-text-muted">ABOUT THIS PROJECT</p>
        <h2 className="mt-2 font-heading text-2xl font-extrabold text-text-main sm:text-3xl">
          A capstone project for Nova Schola Tanauan
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Nova Schola Hub centralizes school announcements and event memories into a single moderated platform. It was
          built as a capstone project for the Bachelor of Science in Information Systems program, demonstrating a
          full-stack application with role-based access control, content moderation, and a modern web stack.
        </p>
        <p className="mt-3 text-xs text-text-muted">Built with Next.js, Express, and PostgreSQL.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="clay-pill rounded-full bg-base px-4 py-1.5 text-xs font-bold text-text-main">Next.js 16</span>
          <span className="clay-pill rounded-full bg-base px-4 py-1.5 text-xs font-bold text-text-main">Express 4</span>
          <span className="clay-pill rounded-full bg-base px-4 py-1.5 text-xs font-bold text-text-main">PostgreSQL</span>
        </div>
      </div>
    </section>
  );
}
