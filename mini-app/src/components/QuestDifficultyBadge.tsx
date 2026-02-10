const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

export function QuestDifficultyBadge({ difficulty, size = 'sm' }: { difficulty: string; size?: 'sm' | 'md' }) {
  const colors = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.hard;
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1 rounded-full'
    : 'text-sm px-3 py-1.5 rounded-xl font-semibold';

  const label = size === 'md'
    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
    : difficulty;

  return <span className={`${sizeClasses} ${colors}`}>{label}</span>;
}
