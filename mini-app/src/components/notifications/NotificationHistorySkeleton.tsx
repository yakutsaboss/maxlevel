export function NotificationHistorySkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20 skeleton-shimmer" role="status" aria-label="Loading notifications">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-b-3xl shadow-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <div className="skeleton h-7 w-40 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="skeleton h-4 w-56 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }} />
      </div>

      {/* Filter tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-7 rounded-full" style={{ width: `${50 + i * 8}px` }} />
          ))}
        </div>
      </div>

      {/* Notification list */}
      <div className="px-4 mt-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex gap-3">
              <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-text h-3.5 w-3/4">&nbsp;</div>
                <div className="skeleton-text h-2.5 w-1/3">&nbsp;</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
