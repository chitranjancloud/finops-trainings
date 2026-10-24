export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-28">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* eyebrow */}
        <div className="skeleton h-4 w-36 rounded-full" />
        {/* heading */}
        <div className="skeleton h-10 max-w-md rounded-2xl" />
        {/* subtext */}
        <div className="space-y-2">
          <div className="skeleton h-4 max-w-lg rounded-full" />
          <div className="skeleton h-4 max-w-sm rounded-full" />
        </div>
        {/* cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-5 w-3/4 rounded-full" />
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton h-4 w-2/3 rounded-full" />
              <div className="skeleton h-9 w-28 rounded-full mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
