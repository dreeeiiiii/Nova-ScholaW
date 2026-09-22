import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 text-center">
      <div className="mx-auto max-w-3xl">
        <span className="inline-block rounded-full bg-[#fff9f2] px-4 py-1.5 text-xs font-bold tracking-wide text-[#315c86]">
          NOVA SCHOLA TANAUAN
        </span>
        <h1 className="mt-6 font-heading text-3xl font-extrabold text-text-main sm:text-5xl">
          Nova Schola Hub
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
          Stay informed. Stay connected. Official school announcements and event memories in one moderated space.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="clay-btn rounded-clay-pill bg-[#315c86] px-6 py-2.5 text-sm font-bold text-white shadow-clay min-h-[44px] flex items-center"
          >
            Log in
          </Link>
          <Link
            href="/gallery"
            className="clay-btn rounded-clay-pill bg-surface px-6 py-2.5 text-sm font-bold text-text-main shadow-clay min-h-[44px] flex items-center"
          >
            Browse gallery
          </Link>
        </div>
      </div>
    </section>
  );
}
