import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Clock, Users } from 'lucide-react';

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  mode: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  progress: number;
  participant_count: number;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

function getTimeRemaining(endDate: string | null, t: (key: string) => string): string {
  if (!endDate) return t('social.noDeadline');
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return t('social.ended');
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}${t('social.daysLeft')}`;
  return `${hours}${t('social.hoursLeft')}`;
}

export const ChallengeCard = memo(function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { t } = useTranslation();
  const progressPercent = challenge.target_value
    ? Math.min(100, Math.round((challenge.progress / challenge.target_value) * 100))
    : 0;
  const timeRemaining = getTimeRemaining(challenge.end_date, t);
  const isCompleted = challenge.target_value ? challenge.progress >= challenge.target_value : false;

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-telegram-text truncate">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-telegram-hint text-xs mt-0.5 line-clamp-2">{challenge.description}</p>
          )}
        </div>
        {challenge.mode && (
          <span className="text-xs bg-telegram-link/10 text-telegram-link px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
            {challenge.mode}
          </span>
        )}
      </div>

      {challenge.target_value && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-telegram-hint">{t('social.progress')}</span>
            <span className="text-telegram-text font-medium">
              {challenge.progress}/{challenge.target_value} ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 bg-telegram-hint/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCompleted ? 'bg-green-400' : 'bg-telegram-link'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-telegram-hint">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {challenge.participant_count} {challenge.participant_count !== 1 ? t('social.participantsPlural') : t('social.participants')}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeRemaining}
        </span>
        {isCompleted && (
          <span className="flex items-center gap-1 text-green-400">
            <Target className="w-3 h-3" />
            {t('social.completed')}
          </span>
        )}
      </div>
    </div>
  );
});
