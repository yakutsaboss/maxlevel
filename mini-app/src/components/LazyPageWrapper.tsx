import { Suspense } from 'react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-telegram-hint/30 border-t-telegram-link rounded-full animate-spin" />
        <span className="text-sm text-telegram-hint">Loading...</span>
      </div>
    </div>
  );
}

export function LazyPageWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}
