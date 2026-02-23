export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20 skeleton-shimmer" role="status" aria-label="Loading dashboard">
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div><div className="skeleton h-7 w-32 rounded-lg mb-2" /><div className="skeleton h-4 w-24 rounded-lg" /></div>
          <div className="skeleton w-16 h-16 rounded-2xl" />
        </div>
        <div className="skeleton h-8 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 -mt-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 shadow-sm border border-telegram-hint/10">
            <div className="skeleton w-10 h-10 rounded-xl mb-2" />
            <div className="skeleton-text h-3 w-16 mb-2">&nbsp;</div>
            <div className="skeleton-text h-6 w-12">&nbsp;</div>
          </div>
        ))}
      </div>
      <div className="px-4 mt-6">
        <div className="skeleton-text h-5 w-32 mb-3">&nbsp;</div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 bg-telegram-secondaryBg rounded-xl px-4 py-2 border border-telegram-hint/20 w-24">
              <div className="skeleton w-8 h-8 rounded-lg mx-auto mb-1" /><div className="skeleton-text h-3 w-full">&nbsp;</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 mt-6">
        <div className="skeleton-text h-5 w-32 mb-3">&nbsp;</div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="skeleton-text h-5 w-3/4 mb-2">&nbsp;</div>
              <div className="skeleton-text h-3 w-full mb-3">&nbsp;</div>
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
