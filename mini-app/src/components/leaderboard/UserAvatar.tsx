import { AVATAR_EMOJI_MAP } from '@/data/avatarOptions';

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-600',
  'bg-indigo-500', 'bg-teal-500', 'bg-rose-500', 'bg-emerald-500',
];

function getColorByUserId(userId: number): string {
  return AVATAR_COLORS[Math.abs(userId) % AVATAR_COLORS.length];
}

function getInitial(firstName?: string, username?: string): string {
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (username) return username.charAt(0).toUpperCase();
  return '?';
}

interface UserAvatarProps {
  userId: number;
  firstName?: string;
  username?: string;
  avatarId?: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const EMOJI_SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function UserAvatar({ userId, firstName, username, avatarId, size = 'md' }: UserAvatarProps) {
  const emoji = avatarId ? AVATAR_EMOJI_MAP[avatarId] : undefined;

  if (emoji) {
    return (
      <div className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center bg-telegram-secondaryBg flex-shrink-0`}>
        <span className={EMOJI_SIZE_CLASSES[size]}>{emoji}</span>
      </div>
    );
  }

  return (
    <div className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getColorByUserId(userId)}`}>
      {getInitial(firstName, username)}
    </div>
  );
}
