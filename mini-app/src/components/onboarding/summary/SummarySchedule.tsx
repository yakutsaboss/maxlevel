import { useTranslation } from 'react-i18next';
import { SectionCard } from './SectionCard';
import type { OnboardingData } from '@/hooks/useOnboarding';

const TYPE_DISPLAY: Record<string, { emoji: string; nameKey: string }> = {
  workout: { emoji: '\uD83D\uDCAA', nameKey: 'onboardingQuiz.punishment.type.workout' },
  book: { emoji: '\uD83D\uDCD6', nameKey: 'onboardingQuiz.punishment.type.book' },
  money: { emoji: '\uD83D\uDCB8', nameKey: 'onboardingQuiz.punishment.type.money' },
};

const DIFFICULTY_LABEL_KEYS: Record<string, Record<string, string>> = {
  workout: {
    easy: 'onboardingQuiz.punishment.diff.workout.easy',
    medium: 'onboardingQuiz.punishment.diff.workout.medium',
    hard: 'onboardingQuiz.punishment.diff.workout.hard',
    extreme: 'onboardingQuiz.punishment.diff.workout.extreme',
  },
  book: {
    easy: 'onboardingQuiz.punishment.diff.book.easy',
    medium: 'onboardingQuiz.punishment.diff.book.medium',
    hard: 'onboardingQuiz.punishment.diff.book.hard',
    extreme: 'onboardingQuiz.punishment.diff.book.extreme',
  },
  money: {
    easy: 'onboardingQuiz.punishment.diff.money.easy',
    medium: 'onboardingQuiz.punishment.diff.money.medium',
    hard: 'onboardingQuiz.punishment.diff.money.hard',
    extreme: 'onboardingQuiz.punishment.diff.money.extreme',
  },
};

interface SummaryScheduleProps {
  data: OnboardingData;
  onEdit: (step: string) => void;
}

export function SummarySchedule({ data, onEdit }: SummaryScheduleProps) {
  const { t } = useTranslation();

  function punishmentSummary(p: NonNullable<OnboardingData['punishments']>): string {
    const type = p.punishment_type;
    const diff = p.difficulty || p.intensity_level || 'easy';
    if (!type) return `${t('onboardingQuiz.summary.enabled')} (${diff})`;
    const td = TYPE_DISPLAY[type] || { emoji: '', nameKey: '' };
    const labelKey = DIFFICULTY_LABEL_KEYS[type]?.[diff];
    const label = labelKey ? t(labelKey) : diff;
    const typeName = td.nameKey ? t(td.nameKey) : type;
    const safe = p.safe_mode ? `, ${t('onboardingQuiz.summary.safeModeOn')}` : '';
    return `${td.emoji} ${typeName} \u2014 ${diff.charAt(0).toUpperCase() + diff.slice(1)} (${label})${safe}`;
  }

  return (
    <>
      <SectionCard title={t('onboardingQuiz.summary.accountability')} onEdit={() => onEdit('punishments')} delay={0.4}>
        <p className="text-sm text-telegram-hint">
          {data.punishments?.consent_given
            ? punishmentSummary(data.punishments)
            : t('onboardingQuiz.summary.noAccountability')}
        </p>
      </SectionCard>

      <SectionCard title={t('onboardingQuiz.summary.notifications')} onEdit={() => onEdit('notifications')} delay={0.45}>
        <p className="text-sm text-telegram-hint">
          {(() => {
            const n = data.notification_preferences;
            if (!n) return t('onboardingQuiz.summary.allEnabled');
            const on = Object.entries(n).filter(([, v]) => v).length;
            return t('onboardingQuiz.summary.enabledCount', { count: on });
          })()}
        </p>
      </SectionCard>
    </>
  );
}
