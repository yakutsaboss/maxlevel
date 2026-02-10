export function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="skeleton w-14 h-14 rounded-2xl" />
          <div>
            <div className="skeleton h-7 w-32 rounded-lg mb-2" />
            <div className="skeleton h-4 w-44 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="px-4 mt-6 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 flex items-center gap-3">
            <div className="skeleton w-6 h-6 rounded-full" />
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="flex-1">
              <div className="skeleton-text h-4 w-24 mb-1">&nbsp;</div>
              <div className="skeleton-text h-3 w-16">&nbsp;</div>
            </div>
            <div className="skeleton h-6 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
