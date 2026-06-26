export default function LeaderboardLoading() {
  return (
    <div className="dark:bg-[#070b14] min-h-screen">
      {/* Hero skeleton */}
      <div className="dark:bg-[#070b14] bg-slate-50 border-b dark:border-white/5 border-slate-200 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-3">
          <div className="h-6 w-32 rounded-full dark:bg-white/5 bg-slate-200 animate-pulse" />
          <div className="h-10 w-56 rounded-xl dark:bg-white/5 bg-slate-200 animate-pulse" />
          <div className="h-4 w-80 rounded-lg dark:bg-white/5 bg-slate-200 animate-pulse" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Podium skeleton */}
        <div className="flex items-end justify-center gap-4 mb-12">
          {[96, 144, 112].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl dark:bg-white/5 bg-slate-200 animate-pulse" />
              <div className="h-3 w-16 rounded dark:bg-white/5 bg-slate-200 animate-pulse" />
              <div className={`w-20 sm:w-24 rounded-t-xl dark:bg-white/5 bg-slate-200 animate-pulse`} style={{ height: h }} />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl dark:bg-white/3 bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-8 h-4 rounded dark:bg-white/10 bg-slate-300" />
              <div className="w-9 h-9 rounded-xl dark:bg-white/10 bg-slate-300" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 rounded dark:bg-white/10 bg-slate-300" />
                <div className="h-3 w-20 rounded dark:bg-white/10 bg-slate-300" />
              </div>
              <div className="hidden sm:block h-5 w-14 rounded-full dark:bg-white/10 bg-slate-300" />
              <div className="h-4 w-10 rounded dark:bg-white/10 bg-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
