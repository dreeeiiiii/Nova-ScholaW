export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="clay rounded-3xl bg-[#fdfaf3] p-8">
        <div className="h-4 w-32 rounded bg-[#f0e6d8]" />
        <div className="mt-3 h-3 w-64 rounded bg-[#f0e6d8]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="clay overflow-hidden rounded-3xl bg-[#fdfaf3] p-4">
            <div className="aspect-[4/3] rounded-2xl bg-[#fbf7ef]" />
            <div className="mt-4 h-4 w-3/4 rounded bg-[#f0e6d8]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[#f0e6d8]" />
          </div>
        ))}
      </div>
    </div>
  );
}
