export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base p-6">
      <div className="clay-card w-full max-w-lg p-8 text-center">
        <h1 className="font-heading text-2xl font-extrabold text-text-main">
          NovaSchola Web — scaffold OK
        </h1>
        <p className="mt-3 font-body text-sm leading-relaxed text-text-muted">
          Clay tokens ported from <code className="rounded bg-base px-1 py-0.5 font-mono text-xs">client/</code> · DM Sans + Raleway via{" "}
          <code className="rounded bg-base px-1 py-0.5 font-mono text-xs">next/font</code> · Tailwind 4
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <span className="clay-badge px-4 py-1.5 text-xs font-semibold text-text-main">base #F0EEFB</span>
          <span className="clay-badge px-4 py-1.5 text-xs font-semibold text-text-main">primary #A78BFA</span>
        </div>
        <div className="mt-6">
          <button className="clay-btn bg-primary px-6 py-2.5 text-sm font-bold text-white">Clay button</button>
        </div>
        <div className="mt-4">
          <input className="clay-input w-full px-4 py-2.5 text-sm" placeholder="clay-input preview" />
        </div>
      </div>
    </main>
  );
}
