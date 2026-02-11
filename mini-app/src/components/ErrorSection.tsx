import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

interface ErrorSectionProps {
  message: string;
  onRetry: () => void;
}

export function ErrorSection({ message, onRetry }: ErrorSectionProps) {
  const { haptic } = useTelegram();

  return (
    <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full" role="alert">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-red-700 mb-1">Something went wrong</h3>
        <p className="text-sm text-red-500 mb-4">{message}</p>
        <button
          onClick={() => { haptic.impact('light'); onRetry(); }}
          aria-label="Retry loading"
          className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />Retry
        </button>
      </div>
    </div>
  );
}
