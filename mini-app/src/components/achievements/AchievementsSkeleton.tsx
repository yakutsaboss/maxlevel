export function AchievementsSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading achievements">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-8 pb-6 px-6 rounded-b-3xl">
        <div className="skeleton h-7 w-40 rounded-lg mb-2" />
        <div className="skeleton h-4 w-28 rounded-lg mb-3" />
        {/* Progress bar skeleton */}
        <div className="bg-white/20 rounded-2xl px-4 py-3 mb-3">
          <div className="skeleton h-3 w-20 rounded mb-2" />
          <div className="skeleton h-2.5 w-full rounded-full" />
        </div>
        {/* Category tabs skeleton */}
        <div className="flex gap-2 overflow-hidden mt-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton shrink-0 h-8 w-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="px-4 mt-6">
        <div className="skeleton h-6 w-36 rounded-lg mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="skeleton w-12 h-12 rounded-xl mx-auto mb-3" />
              <div className="skeleton-text h-4 w-20 mx-auto mb-2">&nbsp;</div>
              <div className="skeleton-text h-3 w-full">&nbsp;</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
