export function AnalyticsSkeleton() {
  return (
    <div className="px-4 py-3 pb-24 skeleton-shimmer" role="status" aria-label="Loading analytics">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="skeleton w-6 h-6 rounded-lg" />
        <div className="skeleton h-7 w-32 rounded-lg" />
      </div>

      {/* Time range toggle */}
      <div className="flex gap-2 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 skeleton h-9 rounded-xl" />
        ))}
      </div>

      {/* Stat cards 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10 text-center">
            <div className="skeleton w-8 h-8 mx-auto mb-2 rounded-xl" />
            <div className="skeleton-text h-5 w-12 mx-auto mb-1">&nbsp;</div>
            <div className="skeleton-text h-3 w-16 mx-auto">&nbsp;</div>
          </div>
        ))}
      </div>

      {/* Additional stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-2.5 text-center border border-telegram-hint/10">
            <div className="skeleton-text h-4 w-8 mx-auto mb-1">&nbsp;</div>
            <div className="skeleton-text h-3 w-14 mx-auto">&nbsp;</div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="mb-5">
        <div className="bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10 p-4">
          <div className="skeleton-text h-4 w-24 mb-3">&nbsp;</div>
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      </div>

      {/* Mode breakdown placeholder */}
      <div className="mb-5">
        <div className="bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10 p-4">
          <div className="skeleton-text h-4 w-32 mb-3">&nbsp;</div>
          <div className="skeleton h-36 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
