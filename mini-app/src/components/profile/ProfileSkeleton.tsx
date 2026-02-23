export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20 skeleton-shimmer" role="status" aria-label="Loading profile">
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6 rounded-b-3xl">
        <div className="text-center">
          <div className="skeleton w-24 h-24 rounded-full mx-auto mb-4" />
          <div className="skeleton h-7 w-40 rounded-lg mx-auto mb-2" />
          <div className="skeleton h-4 w-24 rounded-lg mx-auto mb-6" />
          <div className="flex justify-center gap-6 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="skeleton w-16 h-16 rounded-2xl mb-2" />
                <div className="skeleton h-3 w-14 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 mt-6"><div className="skeleton h-24 w-full rounded-2xl" /></div>
      <div className="px-4 mt-6">
        <div className="skeleton-text h-5 w-28 mb-3">&nbsp;</div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="skeleton w-10 h-10 rounded-lg mx-auto mb-2" />
              <div className="skeleton-text h-4 w-20 mx-auto">&nbsp;</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 mt-6 mb-6">
        <div className="skeleton-text h-5 w-36 mb-3">&nbsp;</div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
              <div className="skeleton w-10 h-10 rounded-lg mx-auto mb-2" />
              <div className="skeleton-text h-3 w-full">&nbsp;</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
