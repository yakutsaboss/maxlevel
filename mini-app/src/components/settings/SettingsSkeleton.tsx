export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-b-3xl">
        <div className="skeleton h-7 w-24 rounded-lg mb-2" />
        <div className="skeleton h-4 w-48 rounded-lg" />
      </div>
      <div className="px-4 mt-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="skeleton h-5 w-32 rounded-lg mb-3" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
