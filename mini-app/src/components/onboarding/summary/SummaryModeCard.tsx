import { useTranslation } from 'react-i18next';
import { SectionCard } from './SectionCard';
import type { OnboardingData } from '@/hooks/useOnboarding';

const MODE_INFO: Record<string, { icon: string; nameKey: string }> = {
  fitness: { icon: '🏋️', nameKey: 'onboarding.modeFitness' },
  hydration: { icon: '💧', nameKey: 'onboarding.modeHydration' },
  finance: { icon: '💰', nameKey: 'onboarding.modeFinance' },
  learning: { icon: '📚', nameKey: 'onboarding.modeLearning' },
};

function fitnessSummary(f: NonNullable<OnboardingData['fitness']>): string | null {
  const parts: string[] = [];
  if (f.fitness_level) parts.push(`${f.fitness_level} level`);
  if (f.workout_frequency) parts.push(`${f.workout_frequency}x/week`);
  if (f.focus_areas?.length) parts.push(f.focus_areas.slice(0, 3).join(', '));
  return parts.length ? parts.join(' | ') : null;
}

function hydrationSummary(h: NonNullable<OnboardingData['hydration']>): string | null {
  const parts: string[] = [];
  if (h.daily_target) parts.push(`${h.daily_target} glasses/day`);
  if (h.reminder_frequency) parts.push(`every ${h.reminder_frequency}`);
  return parts.length ? parts.join(' | ') : null;
}

function financeSummary(f: NonNullable<OnboardingData['finance']>): string | null {
  const parts: string[] = [];
  if (f.goals?.length) parts.push(f.goals.slice(0, 3).join(', '));
  if (f.tracking_frequency) parts.push(f.tracking_frequency.replace('_', ' '));
  return parts.length ? parts.join(' | ') : null;
}

function learningSummary(l: NonNullable<OnboardingData['learning']>): string | null {
  const parts: string[] = [];
  if (l.goals?.length) parts.push(l.goals.slice(0, 3).join(', '));
  if (l.study_frequency) parts.push(`${l.study_frequency}x/week`);
  if (l.daily_minutes) parts.push(`${l.daily_minutes} min/day`);
  return parts.length ? parts.join(' | ') : null;
}

interface SummaryModeCardProps {
  data: OnboardingData;
  onEdit: (step: string) => void;
}

export function SummaryFocusAreas({ data, onEdit }: SummaryModeCardProps) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('onboardingQuiz.summary.focusAreas')} onEdit={() => onEdit('paths')} delay={0.15}>
      <div className="flex flex-wrap gap-2">
        {(data.selected_modes || []).map((mode) => {
          const info = MODE_INFO[mode];
          return (
            <span key={mode} className="bg-telegram-hint/10 rounded-full px-3 py-1 text-sm">
              {info?.icon} {info ? t(info.nameKey) : mode}
            </span>
          );
        })}
      </div>
    </SectionCard>
  );
}

export function SummaryModeCards({ data, onEdit }: SummaryModeCardProps) {
  const { t } = useTranslation();
  return (
    <>
      {data.selected_modes?.includes('fitness') && (
        <SectionCard title={t('onboarding.modeFitness')} onEdit={() => onEdit('fitness_motivation')} delay={0.2}>
          <p className="text-sm text-telegram-hint">{data.fitness ? fitnessSummary(data.fitness) : null}</p>
        </SectionCard>
      )}

      {data.selected_modes?.includes('hydration') && (
        <SectionCard title={t('onboarding.modeHydration')} onEdit={() => onEdit('hydration_intake')} delay={0.25}>
          <p className="text-sm text-telegram-hint">{data.hydration ? hydrationSummary(data.hydration) : null}</p>
        </SectionCard>
      )}

      {data.selected_modes?.includes('finance') && (
        <SectionCard title={t('onboarding.modeFinance')} onEdit={() => onEdit('finance_goals')} delay={0.3}>
          <p className="text-sm text-telegram-hint">{data.finance ? financeSummary(data.finance) : null}</p>
        </SectionCard>
      )}

      {data.selected_modes?.includes('learning') && (
        <SectionCard title={t('onboarding.modeLearning')} onEdit={() => onEdit('learning_goals')} delay={0.35}>
          <p className="text-sm text-telegram-hint">{data.learning ? learningSummary(data.learning) : null}</p>
        </SectionCard>
      )}
    </>
  );
}
