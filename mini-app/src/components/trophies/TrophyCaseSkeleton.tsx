export function TrophyCaseSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton h-7 w-36 rounded-lg" />
        </div>
        {/* Progress bar */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="skeleton h-4 w-20 rounded-lg" />
            <div className="skeleton h-4 w-14 rounded-lg" />
          </div>
          <div className="skeleton h-2.5 w-full rounded-full" />
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
      </div>

      {/* Trophy grid skeleton */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
          >
            <div className="skeleton w-12 h-12 rounded-lg mx-auto mb-3" />
            <div className="skeleton h-3 w-20 rounded-lg mx-auto mb-2" />
            <div className="skeleton h-3 w-14 rounded-full mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
