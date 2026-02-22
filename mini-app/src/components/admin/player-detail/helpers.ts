import { formatDate } from '@/utils/formatDate';

export function tierColor(tier: string): string {
  switch (tier) {
    case 'premium': return 'bg-yellow-500 text-white';
    case 'subscriber': return 'bg-blue-500 text-white';
    default: return 'bg-telegram-hint/20 text-telegram-hint';
  }
}

export function xpForLevel(level: number): number {
  return level * 100;
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}
