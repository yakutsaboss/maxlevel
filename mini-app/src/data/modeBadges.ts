/** Mode badge metadata — icon, display name, and Tailwind color classes. */
export const MODE_BADGES: Record<string, { icon: string; name: string; color: string }> = {
  fitness: { icon: '🏋️', name: 'Fitness', color: 'bg-red-500/15 text-red-400' },
  hydration: { icon: '💧', name: 'Hydration', color: 'bg-blue-500/15 text-blue-400' },
  finance: { icon: '💰', name: 'Finance', color: 'bg-yellow-500/15 text-yellow-400' },
  learning: { icon: '📚', name: 'Learning', color: 'bg-green-500/15 text-green-400' },
};
