import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface AchievementProgressBarProps {
  criteria?: Record<string, unknown>;
  currentValue: number;
  targetValue: number;
}

function getProgressLabel(
  criteria: Record<string, unknown> | undefined,
  current: number,
  target: number,
  t: (key: string) => string,
): string {
  if (!criteria?.type) return `${current}/${target}`;

  const type = criteria.type as string;

  switch (type) {
    case 'friend_count':
      return `${current}/${target} ${t('achievements.progressFriends')}`;
    case 'streak':
      return `${current}/${target} ${t('achievements.progressDays')}`;
    case 'quest_count':
    case 'quest_complete':
    case 'quest_complete_consecutive':
      return `${current}/${target} ${t('achievements.progressQuests')}`;
    case 'level':
    case 'level_reached':
      return `${t('achievements.progressLevel')} ${current}/${target}`;
    case 'total_xp':
      return `${current.toLocaleString()}/${target.toLocaleString()} XP`;
    case 'challenge_created':
    case 'challenge_completed':
      return `${current}/${target} ${t('achievements.progressChallenges')}`;
    case 'multi_mode_active':
      return `${current}/${target} ${t('achievements.progressModes')}`;
    case 'weekend_quests':
      return `${current}/${target} ${t('achievements.progressQuests')}`;
    case 'all_daily_complete':
      return `${current}/${target} ${t('achievements.progressDays')}`;
    case 'night_quest':
    case 'early_quest':
      return current >= 1 ? t('achievements.unlocked') : t('achievements.progressNotYet');
    default:
      return `${current}/${target}`;
  }
}

/** Check if this criteria type supports showing progress */
function hasProgressBar(criteria?: Record<string, unknown>): boolean {
  if (!criteria?.type) return false;
  const type = criteria.type as string;
  // night_quest and early_quest are binary — no bar
  return !['night_quest', 'early_quest'].includes(type);
}

export function AchievementProgressBar({ criteria, currentValue, targetValue }: AchievementProgressBarProps) {
  const { t } = useTranslation();
  const showBar = hasProgressBar(criteria);
  const pct = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
  const label = getProgressLabel(criteria, currentValue, targetValue, t);

  return (
    <div className="w-full mt-1.5">
      <p className="text-[10px] text-telegram-hint text-center mb-1">{label}</p>
      {showBar && (
        <div className="bg-telegram-hint/15 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-telegram-link rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}
    </div>
  );
}
