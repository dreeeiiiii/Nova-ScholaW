export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="clay rounded-3xl bg-[#fdfaf3] p-6">
        <div className="h-4 w-32 rounded bg-[#f0e6d8]" />
        <div className="mt-3 h-3 w-64 rounded bg-[#f0e6d8]" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="clay rounded-3xl bg-[#fdfaf3] p-6">
            <div className="h-4 w-24 rounded bg-[#f0e6d8]" />
            <div className="mt-3 h-5 w-3/4 rounded bg-[#f0e6d8]" />
            <div className="mt-2 h-3 w-full rounded bg-[#f0e6d8]" />
            <div className="mt-1 h-3 w-5/6 rounded bg-[#f0e6d8]" />
          </div>
        ))}
      </div>
    </div>
  );
}
