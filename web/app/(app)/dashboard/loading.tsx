export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="clay rounded-[2rem] bg-[#e7defb] p-7 sm:p-10">
        <div className="h-6 w-40 rounded-full bg-[#fff9f2]" />
        <div className="mt-5 h-6 w-64 rounded bg-white/50" />
        <div className="mt-3 h-4 w-80 rounded bg-white/30" />
      </div>
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="clay rounded-3xl bg-[#fdfaf3] p-5">
            <div className="h-6 w-6 rounded bg-[#f0e6d8]" />
            <div className="mt-6 h-4 w-24 rounded bg-[#f0e6d8]" />
            <div className="mt-2 h-6 w-12 rounded bg-[#f0e6d8]" />
          </div>
        ))}
      </div>
    </div>
  );
}
