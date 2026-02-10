export function QuestsSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-14 h-14 rounded-2xl" />
          <div>
            <div className="skeleton h-7 w-24 rounded-lg mb-2" />
            <div className="skeleton h-4 w-40 rounded-lg" />
          </div>
        </div>
        <div className="skeleton h-10 w-full rounded-2xl" />
      </div>
      <div className="px-4 mt-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="skeleton-text h-5 w-3/4 mb-2">&nbsp;</div>
                <div className="skeleton-text h-3 w-full">&nbsp;</div>
              </div>
              <div className="skeleton w-16 h-7 rounded-lg ml-3" />
            </div>
            <div className="skeleton h-2 w-full rounded-full mb-3" />
            <div className="flex gap-2">
              <div className="skeleton h-6 w-14 rounded-full" />
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
