import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Clock, Users, Plus, Loader2, Check, Eye } from 'lucide-react';

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
  onUpdateProgress?: (challengeId: number, progress: number) => Promise<void>;
  onViewDetails?: (challengeId: number) => void;
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

export const ChallengeCard = memo(function ChallengeCard({ challenge, onUpdateProgress, onViewDetails }: ChallengeCardProps) {
  const { t } = useTranslation();
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const progressPercent = challenge.target_value
    ? Math.min(100, Math.round((challenge.progress / challenge.target_value) * 100))
    : 0;
  const timeRemaining = getTimeRemaining(challenge.end_date, t);
  const isCompleted = challenge.target_value ? challenge.progress >= challenge.target_value : false;

  const handleConfirm = async () => {
    const value = parseInt(inputValue);
    if (isNaN(value) || value <= 0 || !onUpdateProgress) return;
    try {
      setUpdating(true);
      await onUpdateProgress(challenge.id, challenge.progress + value);
      setInputValue('');
      setShowInput(false);
    } finally {
      setUpdating(false);
    }
  };

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
            <div className="flex items-center gap-2">
              <span className="text-telegram-text font-medium">
                {challenge.progress}/{challenge.target_value} ({progressPercent}%)
              </span>
              {onUpdateProgress && !isCompleted && !showInput && (
                <button
                  onClick={() => setShowInput(true)}
                  className="p-1 rounded-lg bg-telegram-link/10 text-telegram-link active:scale-95 transition-transform"
                  aria-label={t('social.logProgress')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="h-2 bg-telegram-hint/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCompleted ? 'bg-green-400' : 'bg-telegram-link'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {showInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="+1"
                className="w-20 bg-telegram-bg border border-telegram-hint/20 rounded-lg px-2 py-1 text-telegram-text text-sm text-center placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
                autoFocus
              />
              <button
                onClick={handleConfirm}
                disabled={updating || !inputValue.trim() || isNaN(parseInt(inputValue)) || parseInt(inputValue) <= 0}
                className="p-1.5 rounded-lg bg-telegram-link text-white active:scale-95 transition-transform disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => { setShowInput(false); setInputValue(''); }}
                className="text-xs text-telegram-hint"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
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
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(challenge.id)}
            className="flex items-center gap-1 text-xs text-telegram-link font-medium px-2 py-1 rounded-lg bg-telegram-link/10 active:scale-95 transition-transform"
          >
            <Eye className="w-3 h-3" />
            {t('social.viewDetails')}
          </button>
        )}
      </div>
    </div>
  );
});
