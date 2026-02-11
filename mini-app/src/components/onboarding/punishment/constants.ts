export type PunishmentType = 'workout' | 'book' | 'money';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export const PUNISHMENT_TYPES: {
  value: PunishmentType;
  emoji: string;
  label: string;
  tagline: string;
  gradient: string;
  border: string;
  glow: string;
}[] = [
  {
    value: 'workout',
    emoji: '\uD83D\uDCAA',
    label: 'Workout',
    tagline: 'Missed a task? Drop and give me pushups!',
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500',
    glow: 'shadow-amber-500/30',
  },
  {
    value: 'book',
    emoji: '\uD83D\uDCD6',
    label: 'Book',
    tagline: 'Skipped your goal? Time to read.',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
  },
  {
    value: 'money',
    emoji: '\uD83D\uDCB8',
    label: 'Money',
    tagline: 'Failed today? Donate to a good cause.',
    gradient: 'from-emerald-500/20 to-green-500/10',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/30',
  },
];

export const DIFFICULTY_MAP: Record<PunishmentType, { value: Difficulty; label: string; dot: string }[]> = {
  workout: [
    { value: 'easy', label: '20 pushups', dot: '\uD83D\uDFE2' },
    { value: 'medium', label: '50 pushups', dot: '\uD83D\uDFE1' },
    { value: 'hard', label: '100 pushups', dot: '\uD83D\uDFE0' },
    { value: 'extreme', label: '200 pushups + 1 min plank', dot: '\uD83D\uDD34' },
  ],
  book: [
    { value: 'easy', label: 'Read 10 pages', dot: '\uD83D\uDFE2' },
    { value: 'medium', label: 'Read 30 pages', dot: '\uD83D\uDFE1' },
    { value: 'hard', label: 'Read 50 pages', dot: '\uD83D\uDFE0' },
    { value: 'extreme', label: 'Read 100 pages', dot: '\uD83D\uDD34' },
  ],
  money: [
    { value: 'easy', label: 'Donate $1', dot: '\uD83D\uDFE2' },
    { value: 'medium', label: 'Donate $5', dot: '\uD83D\uDFE1' },
    { value: 'hard', label: 'Donate $10', dot: '\uD83D\uDFE0' },
    { value: 'extreme', label: 'Donate $25', dot: '\uD83D\uDD34' },
  ],
};
