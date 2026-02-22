export type PunishmentType = 'workout' | 'book' | 'money';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export const PUNISHMENT_TYPES: {
  value: PunishmentType;
  emoji: string;
  labelKey: string;
  taglineKey: string;
  gradient: string;
  border: string;
  glow: string;
}[] = [
  {
    value: 'workout',
    emoji: '\uD83D\uDCAA',
    labelKey: 'onboardingQuiz.punishment.type.workout',
    taglineKey: 'onboardingQuiz.punishment.type.workoutTagline',
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500',
    glow: 'shadow-amber-500/30',
  },
  {
    value: 'book',
    emoji: '\uD83D\uDCD6',
    labelKey: 'onboardingQuiz.punishment.type.book',
    taglineKey: 'onboardingQuiz.punishment.type.bookTagline',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
  },
  {
    value: 'money',
    emoji: '\uD83D\uDCB8',
    labelKey: 'onboardingQuiz.punishment.type.money',
    taglineKey: 'onboardingQuiz.punishment.type.moneyTagline',
    gradient: 'from-emerald-500/20 to-green-500/10',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/30',
  },
];

export const DIFFICULTY_MAP: Record<PunishmentType, { value: Difficulty; labelKey: string; dot: string }[]> = {
  workout: [
    { value: 'easy', labelKey: 'onboardingQuiz.punishment.diff.workout.easy', dot: '\uD83D\uDFE2' },
    { value: 'medium', labelKey: 'onboardingQuiz.punishment.diff.workout.medium', dot: '\uD83D\uDFE1' },
    { value: 'hard', labelKey: 'onboardingQuiz.punishment.diff.workout.hard', dot: '\uD83D\uDFE0' },
    { value: 'extreme', labelKey: 'onboardingQuiz.punishment.diff.workout.extreme', dot: '\uD83D\uDD34' },
  ],
  book: [
    { value: 'easy', labelKey: 'onboardingQuiz.punishment.diff.book.easy', dot: '\uD83D\uDFE2' },
    { value: 'medium', labelKey: 'onboardingQuiz.punishment.diff.book.medium', dot: '\uD83D\uDFE1' },
    { value: 'hard', labelKey: 'onboardingQuiz.punishment.diff.book.hard', dot: '\uD83D\uDFE0' },
    { value: 'extreme', labelKey: 'onboardingQuiz.punishment.diff.book.extreme', dot: '\uD83D\uDD34' },
  ],
  money: [
    { value: 'easy', labelKey: 'onboardingQuiz.punishment.diff.money.easy', dot: '\uD83D\uDFE2' },
    { value: 'medium', labelKey: 'onboardingQuiz.punishment.diff.money.medium', dot: '\uD83D\uDFE1' },
    { value: 'hard', labelKey: 'onboardingQuiz.punishment.diff.money.hard', dot: '\uD83D\uDFE0' },
    { value: 'extreme', labelKey: 'onboardingQuiz.punishment.diff.money.extreme', dot: '\uD83D\uDD34' },
  ],
};
