import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react';

export function ActivityHub() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-telegram-bg pb-24 px-4 pt-4">
      <h1 className="text-xl font-bold text-telegram-text mb-4">
        {t('activityHub.title')}
      </h1>
      <div className="flex flex-col items-center justify-center py-16 text-telegram-hint">
        <Dumbbell className="w-12 h-12 mb-4 opacity-50" />
        <p>{t('activityHub.noActivities')}</p>
      </div>
    </div>
  );
}
