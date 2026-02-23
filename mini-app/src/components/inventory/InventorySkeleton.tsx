export function InventorySkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20 skeleton-shimmer" role="status" aria-label="Loading inventory">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <div className="skeleton w-7 h-7 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="skeleton h-7 w-32 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Total items card */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-4 w-24 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="skeleton h-5 w-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-8 rounded-lg" style={{ width: `${60 + i * 5}px`, background: 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="px-4 mt-4 grid grid-cols-1 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-start gap-3">
              <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="skeleton-text h-4 w-24">&nbsp;</div>
                  <div className="skeleton h-4 w-12 rounded-full" />
                </div>
                <div className="skeleton-text h-3 w-full mb-1.5">&nbsp;</div>
                <div className="flex items-center gap-3">
                  <div className="skeleton-text h-3 w-16">&nbsp;</div>
                  <div className="skeleton-text h-3 w-12">&nbsp;</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
