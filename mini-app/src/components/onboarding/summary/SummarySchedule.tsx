import { SectionCard } from './SectionCard';
import type { OnboardingData } from '@/hooks/useOnboarding';

const TYPE_DISPLAY: Record<string, { emoji: string; name: string }> = {
  workout: { emoji: '\uD83D\uDCAA', name: 'Workout' },
  book: { emoji: '\uD83D\uDCD6', name: 'Book' },
  money: { emoji: '\uD83D\uDCB8', name: 'Money' },
};

const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
  workout: { easy: '20 pushups', medium: '50 pushups', hard: '100 pushups', extreme: '200 pushups + plank' },
  book: { easy: '10 pages', medium: '30 pages', hard: '50 pages', extreme: '100 pages' },
  money: { easy: '$1', medium: '$5', hard: '$10', extreme: '$25' },
};

function punishmentSummary(p: NonNullable<OnboardingData['punishments']>): string {
  const type = p.punishment_type;
  const diff = p.difficulty || p.intensity_level || 'easy';
  if (!type) return `Enabled (${diff})`;
  const t = TYPE_DISPLAY[type] || { emoji: '', name: type };
  const label = DIFFICULTY_LABELS[type]?.[diff] || diff;
  const safe = p.safe_mode ? ', Safe Mode ON' : '';
  return `${t.emoji} ${t.name} \u2014 ${diff.charAt(0).toUpperCase() + diff.slice(1)} (${label})${safe}`;
}

interface SummaryScheduleProps {
  data: OnboardingData;
  onEdit: (step: string) => void;
}

export function SummarySchedule({ data, onEdit }: SummaryScheduleProps) {
  return (
    <>
      {/* Accountability */}
      <SectionCard title="Accountability" onEdit={() => onEdit('punishments')} delay={0.4}>
        <p className="text-sm text-telegram-hint">
          {data.punishments?.consent_given
            ? punishmentSummary(data.punishments)
            : 'No accountability enabled'}
        </p>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications" onEdit={() => onEdit('notifications')} delay={0.45}>
        <p className="text-sm text-telegram-hint">
          {(() => {
            const n = data.notification_preferences;
            if (!n) return 'All enabled';
            const on = Object.entries(n).filter(([, v]) => v).length;
            return `${on}/4 enabled`;
          })()}
        </p>
      </SectionCard>
    </>
  );
}
