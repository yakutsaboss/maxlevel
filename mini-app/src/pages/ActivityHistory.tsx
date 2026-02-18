import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBackButton } from '@/hooks/useTelegram';
import { History } from 'lucide-react';

export function ActivityHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useBackButton(() => navigate('/activity'));

  return (
    <div className="min-h-screen bg-telegram-bg pb-24 px-4 pt-4">
      <h1 className="text-xl font-bold text-telegram-text mb-4">
        {t('activityHistory.title')}
      </h1>
      <div className="flex flex-col items-center justify-center py-16 text-telegram-hint">
        <History className="w-12 h-12 mb-4 opacity-50" />
        <p>{t('activityHistory.noActivities')}</p>
      </div>
    </div>
  );
}
