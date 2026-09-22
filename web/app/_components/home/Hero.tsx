import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 md:pt-20 pb-20 md:pb-32 overflow-hidden bg-base">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] organic-shape bg-primary/5 blur-[200px]" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      <div className="container-editorial relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          <div className="lg:col-span-7 lg:col-start-1 flex flex-col justify-center min-h-[65vh] md:min-h-[75vh]">
            <div className="fade-up stagger-2 mt-5 md:mt-8">
              <h1 className="text-hero font-heading text-text-main text-balance leading-[0.9] tracking-tight">
                A better way for<br />
                schools to<br />
                communicate.
              </h1>
            </div>
            <div className="fade-up stagger-3 mt-7 md:mt-10 max-w-xl">
              <p className="text-body-lg text-text-muted leading-relaxed">
                Official announcements, targeted class updates, and a moderated event gallery —
                built for how a school actually communicates.
              </p>
            </div>
            <div className="fade-up stagger-4 mt-9 md:mt-12 flex flex-wrap items-center gap-4">
              <Link href="/register" className="btn-editorial btn-editorial-primary">
                Get started
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/gallery" className="btn-editorial btn-editorial-secondary">
                Browse gallery
              </Link>
            </div>
            <div className="fade-up stagger-5 mt-10 flex flex-wrap items-center gap-6 text-sm text-text-muted">

            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 relative scale-in">
            <div className="relative aspect-[3/4] max-w-md mx-auto lg:mx-0">
              <div className="absolute inset-0 organic-shape bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/10 blur-[100px] opacity-60" aria-hidden="true" />
              <div className="absolute inset-0 organic-shape-2 bg-gradient-to-tr from-primary/10 to-transparent blur-[80px] opacity-40" aria-hidden="true" />

              <div className="relative z-10 absolute inset-0 organic-shape bg-base border border-primary/10 flex items-center justify-center overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center p-6 md:p-10">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 380 500"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    className="text-primary/25"
                  >
                    <defs>
                      <pattern id="gridHero" width="38" height="38" patternUnits="userSpaceOnUse">
                        <path d="M 38 0 L 0 0 0 38" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
                      </pattern>
                    </defs>
                    <rect width="380" height="500" fill="url(#gridHero)" rx="28" />

                    <g transform="translate(50, 60)" opacity="0.7">
                      <rect x="0" y="0" width="280" height="170" rx="14" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
                      <rect x="20" y="20" width="240" height="5" rx="2.5" fill="currentColor" fillOpacity="0.35" />
                      <rect x="20" y="33" width="190" height="3.5" rx="1.75" fill="currentColor" fillOpacity="0.2" />
                      <rect x="20" y="44" width="140" height="3.5" rx="1.75" fill="currentColor" fillOpacity="0.15" />
                      <rect x="20" y="65" width="100" height="40" rx="10" fill="currentColor" fillOpacity="0.2" />
                    </g>

                    <g transform="translate(50, 260)" opacity="0.55">
                      <circle cx="55" cy="55" r="48" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
                      <path d="M35 55h40M55 35v40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </g>

                    <g transform="translate(260, 360)" opacity="0.45">
                      <rect x="0" y="0" width="80" height="80" rx="18" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                      <path d="M22 40h36M40 22v36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </g>

                    <g transform="translate(40, 430)" opacity="0.35">
                      <path d="M0 35 Q30 0 60 35 Q90 70 120 35" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
                    </g>
                  </svg>
                </div>

                <div className="absolute -bottom-5 -right-5 md:-bottom-8 md:-right-8 fade-up stagger-6">
                  <div className="organic-shape bg-primary p-4 md:p-5 shadow-[0_24px_48px_rgba(167,139,250,0.35)]">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden="true">
                      <path d="M21 15.5c0 2.5-2 4.5-4.5 4.5S12 18 12 15.5" />
                      <path d="M16 9h.01M16 14.5h.01" />
                      <circle cx="9" cy="9.5" r="5.5" />
                      <path d="M17 20h.01" />
                    </svg>
                  </div>
                </div>

                <div className="absolute -top-5 -left-5 md:-top-8 md:-left-8 fade-up stagger-5">
                  <div className="organic-shape-3 bg-base border border-primary/20 p-3 md:p-4 shadow-[0_12px_32px_rgba(46,42,69,0.15)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M9 9h6M9 12h4M9 15h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 md:h-48 bg-gradient-to-t from-base to-transparent pointer-events-none" aria-hidden="true" />
    </section>
  );
}