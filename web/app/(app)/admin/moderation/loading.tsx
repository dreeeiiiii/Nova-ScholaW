export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 rounded bg-[#f0e6d8]" />
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="clay overflow-hidden rounded-3xl bg-[#fdfaf3] p-6">
            <div className="h-4 w-24 rounded-full bg-[#ffe1d1]" />
            <div className="mt-4 aspect-[4/3] rounded-2xl bg-[#fbf7ef]" />
            <div className="mt-4 h-5 w-3/4 rounded bg-[#f0e6d8]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[#f0e6d8]" />
          </div>
        ))}
      </div>
    </div>
  );
}
