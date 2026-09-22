import Link from "next/link";

export default function CTASection() {
  return (
    <section className="section-space-sm relative overflow-hidden bg-[#1a0b2e]">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] organic-shape bg-primary/10 blur-[200px]" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      <div className="container-editorial relative">
        <div className="relative rounded-[40px] p-8 md:p-12 lg:p-16 xl:p-20 text-center">
          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="text-eyebrow text-primary">READY TO GET STARTED?</span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white mt-3 text-balance leading-[1.02]">
              Join Nova Schola Hub today
            </h2>
            <p className="text-body-lg text-white/70 mt-5 max-w-xl mx-auto">
              Set up your school&apos;s announcement hub in minutes. Free for educational institutions.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/register" className="btn-editorial btn-editorial-primary group">
                Create your hub
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/gallery" className="btn-editorial bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                Explore gallery
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}