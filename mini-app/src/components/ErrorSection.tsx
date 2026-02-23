import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '@/hooks/useTelegram';

interface ErrorSectionProps {
  message: string;
  onRetry: () => void;
  maxRetries?: number;
}

export function ErrorSection({ message, onRetry, maxRetries = 3 }: ErrorSectionProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [retryCount, setRetryCount] = useState(0);

  const exhausted = retryCount >= maxRetries;

  const handleRetry = () => {
    if (exhausted) return;
    haptic.impact('light');
    setRetryCount(prev => prev + 1);
    onRetry();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full" role="alert">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-red-700 mb-1">{t('errors.somethingWentWrong')}</h3>
        <p className="text-sm text-red-500 mb-4">{message}</p>
        <button
          onClick={handleRetry}
          disabled={exhausted}
          aria-label={exhausted ? t('errors.tryAgain') : `${t('errors.tryAgain')} (${retryCount + 1}/${maxRetries})`}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-transform ${
            exhausted
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 text-white active:scale-95'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${!exhausted ? '' : 'opacity-50'}`} aria-hidden="true" />
          {exhausted
            ? t('errors.serverError')
            : `${t('errors.tryAgain')} (${retryCount + 1}/${maxRetries})`
          }
        </button>
      </div>
    </div>
  );
}
