import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import type { OnboardingData } from '@/hooks/useOnboarding';

interface SummaryProps {
  progress: number;
  stepLabel?: string;
  data: OnboardingData;
  onEdit: (step: string) => void;
  onNext: () => void;
}

const MODE_INFO: Record<string, { icon: string; name: string }> = {
  fitness: { icon: '🏋️', name: 'Fitness' },
  hydration: { icon: '💧', name: 'Hydration' },
  finance: { icon: '💰', name: 'Finance' },
  learning: { icon: '📚', name: 'Learning' },
};

const AVATAR_LABELS: Record<string, string> = {
  gym_warrior: 'Gym Warrior',
  office_boss: 'Office Boss',
  magic_pet: 'Magic Pet',
  night_owl: 'Night Owl',
  couch_hero: 'Couch Hero',
  // Legacy values
  male: 'Warrior',
  female: 'Sorceress',
  other: 'Shapeshifter',
};

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

export function Summary({ progress, stepLabel, data, onEdit, onNext }: SummaryProps) {
  const { user, haptic } = useTelegram();
  const name = data.nickname || user?.first_name || 'Friend';
  const avatarLabel = AVATAR_LABELS[data.gender || ''] || data.gender || 'Unknown';

  const fitnessSummary = () => {
    const f = data.fitness;
    if (!f) return null;
    const parts: string[] = [];
    if (f.fitness_level) parts.push(`${f.fitness_level} level`);
    if (f.workout_frequency) parts.push(`${f.workout_frequency}x/week`);
    if (f.focus_areas?.length) parts.push(f.focus_areas.slice(0, 3).join(', '));
    return parts.join(' | ');
  };

  const hydrationSummary = () => {
    const h = data.hydration;
    if (!h) return null;
    const parts: string[] = [];
    if (h.daily_target) parts.push(`${h.daily_target} glasses/day`);
    if (h.reminder_frequency) parts.push(`every ${h.reminder_frequency}`);
    return parts.join(' | ');
  };

  const financeSummary = () => {
    const f = data.finance;
    if (!f) return null;
    const parts: string[] = [];
    if (f.goals?.length) parts.push(f.goals.slice(0, 3).join(', '));
    if (f.tracking_frequency) parts.push(f.tracking_frequency.replace('_', ' '));
    return parts.join(' | ');
  };

  const learningSummary = () => {
    const l = data.learning;
    if (!l) return null;
    const parts: string[] = [];
    if (l.goals?.length) parts.push(l.goals.slice(0, 3).join(', '));
    if (l.study_frequency) parts.push(`${l.study_frequency}x/week`);
    if (l.daily_minutes) parts.push(`${l.daily_minutes} min/day`);
    return parts.join(' | ');
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col px-6 pt-6 pb-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold text-telegram-text mb-1">Almost Done!</h2>
          <p className="text-telegram-hint text-sm">Review your setup before we begin</p>
        </motion.div>

        {/* Hero card */}
        <motion.div
          className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-5 mb-4 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white text-xl font-bold">{name}</h3>
              <p className="text-purple-200 text-sm">{avatarLabel}</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
              <div className="text-white text-2xl font-bold">1</div>
              <div className="text-purple-200 text-xs">Level</div>
            </div>
          </div>
          <div className="mt-3 bg-white/20 rounded-full h-2">
            <div className="h-full bg-yellow-400 rounded-full" style={{ width: '10%' }} />
          </div>
          <p className="text-purple-200 text-xs mt-1 text-right">0 / 500 XP</p>
        </motion.div>

        {/* Focus areas */}
        <SectionCard title="Focus Areas" onEdit={() => onEdit('paths')} delay={0.15}>
          <div className="flex flex-wrap gap-2">
            {(data.selected_modes || []).map((mode) => {
              const info = MODE_INFO[mode];
              return (
                <span key={mode} className="bg-telegram-hint/10 rounded-full px-3 py-1 text-sm">
                  {info?.icon} {info?.name || mode}
                </span>
              );
            })}
          </div>
        </SectionCard>

        {/* Fitness summary */}
        {data.selected_modes?.includes('fitness') && (
          <SectionCard title="Fitness" onEdit={() => onEdit('fitness_motivation')} delay={0.2}>
            <p className="text-sm text-telegram-hint">{fitnessSummary()}</p>
          </SectionCard>
        )}

        {/* Hydration summary */}
        {data.selected_modes?.includes('hydration') && (
          <SectionCard title="Hydration" onEdit={() => onEdit('hydration_intake')} delay={0.25}>
            <p className="text-sm text-telegram-hint">{hydrationSummary()}</p>
          </SectionCard>
        )}

        {/* Finance summary */}
        {data.selected_modes?.includes('finance') && (
          <SectionCard title="Finance" onEdit={() => onEdit('finance_goals')} delay={0.3}>
            <p className="text-sm text-telegram-hint">{financeSummary()}</p>
          </SectionCard>
        )}

        {/* Learning summary */}
        {data.selected_modes?.includes('learning') && (
          <SectionCard title="Learning" onEdit={() => onEdit('learning_goals')} delay={0.35}>
            <p className="text-sm text-telegram-hint">{learningSummary()}</p>
          </SectionCard>
        )}

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
      </div>

      <div className="px-6 pb-8">
        <motion.button
          onClick={() => { haptic.notification('success'); onNext(); }}
          className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
          whileTap={{ scale: 0.97 }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(168, 85, 247, 0)',
              '0 0 20px 4px rgba(168, 85, 247, 0.3)',
              '0 0 0 0 rgba(168, 85, 247, 0)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Let's Start!
        </motion.button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  onEdit,
  delay,
  children,
}: {
  title: string;
  onEdit: () => void;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="bg-telegram-secondaryBg rounded-2xl p-4 mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-telegram-text text-sm">{title}</h4>
        <button onClick={onEdit} className="text-xs text-telegram-link font-medium">
          Edit
        </button>
      </div>
      {children}
    </motion.div>
  );
}
